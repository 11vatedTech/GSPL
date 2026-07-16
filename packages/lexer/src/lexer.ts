/**
 * Main lexer. Prompt 3 Lexer Integrity Repair.
 *
 * Two-phase architecture (Prompt 3 Lexer Integrity Repair §5):
 *   Phase A — mutable construction:
 *     - One MutableTokenBuilder per emitted token, accumulated in `builders`.
 *     - Trivia routes directly: post-newline → `pendingLeading`; same-line →
 *       `currentToken.trailingTrivia`; pre-first-token → `pendingLeading`.
 *     - No pending-trivia state variable; no mutations to already-finalized
 *       tokens.
 *   Phase B — immutable publication:
 *     - After the source is exhausted, walk `builders` and produce a
 *       readonly `Token[]`. Each trivia array is spread to a fresh array
 *       and `Object.freeze`d so no caller can mutate it.
 *
 * EOF ownership (Prompt 3 Lexer Integrity Repair §6):
 *   - Same-line spaces/tabs/line-comments/line-free-block-comments at EOF
 *     belong to the preceding token's `trailingTrivia`.
 *   - Post-newline trivia at EOF belongs to `EOF.leadingTrivia`.
 *   - A file containing only trivia makes that trivia `EOF.leadingTrivia`.
 *   - The published EOF is just the last MutableTokenBuilder in the list.
 *
 * Trivia ownership (Prompt 3 §3 / §6):
 *   - BOM is the first token's leading trivia.
 *   - Newline forms (LF, CRLF, CR, U+2028, U+2029) are line terminators and
 *     belong to the next token's leading trivia (or to EOF if no next token
 *     exists).
 *
 * Identifier Unicode security (Prompt 3 §4 / §11): every identifier is
 * analysed through @gspl/text-source analyzeIdentifier. Plain-ASCII letters
 * take an ASCII fast path that produces no warnings.
 *
 * Keyword / literal boundary recognition (Prompt 3 §3 / §6): single
 * authoritative `lookupKeywordOrLiteral` against the language profile.
 *
 * Diagnostic limit (Prompt 3 Integrity Repair §12): every diagnostic
 * emission is funnelled through `pushDiagSafe`. When the configured
 * `maxDiagnostics` ceiling is reached, the FINAL remaining slot is reserved
 * for `GSPL-LEX-DIAGNOSTIC-LIMIT` — all subsequent emissions are discarded
 * deterministically. This makes `maxDiagnostics = 1` emit exactly one
 * `GSPL-LEX-DIAGNOSTIC-LIMIT` diagnostic.
 */
import type { SourceDocument, SourceLimits, Diagnostic, SourceId, DiagnosticSeverity } from '@gspl/text-source';
import { DEFAULT_SOURCE_LIMITS, makeDiagnostic, analyzeIdentifier, isIdentifierStartChar } from '@gspl/text-source';
import { SyntaxKind, GreenToken, GreenTrivia, isKeyword, isTrivia } from '@gspl/syntax-tree';
import type { Token, LexResult, LexerStatistics, LexerOperationalMetrics, SemanticValue } from './token.js';
import { scanNumericLiteral } from './lex-numeric.js';
import { scanStringLiteral } from './lex-string.js';
import { scanLineComment, scanBlockComment, scanWhitespace } from './lex-comment.js';
import { scanIdentifierOrKeyword, scanPunctuationOrOperator } from './keyword.js';
import { resolveLanguageProfile, lookupKeywordOrLiteral, type LexicalLanguageProfile, type LexicalDiagnostics } from './lang-profile.js';

export interface LexerOptions {
  readonly limits?: SourceLimits;
  readonly languageVersion?: string;
  readonly nestedBlockComments?: boolean;
}

/**
 * MutableTokenBuilder — Phase A internal struct. The published Token never
 * shares a reference with this struct.
 */
export interface MutableTokenBuilder {
  readonly kind: SyntaxKind;
  readonly text: string;
  readonly startOffset: number;
  readonly endOffset: number;
  readonly leadingTrivia: GreenTrivia[];
  readonly trailingTrivia: GreenTrivia[];
  readonly semanticValue?: SemanticValue;
}

export function lexSource(source: SourceDocument, options: LexerOptions = {}): LexResult {
  const limits = options.limits ?? DEFAULT_SOURCE_LIMITS;
  const nested = options.nestedBlockComments ?? true;
  const text = source.text;
  const length = text.length;

  const diagnostics: Diagnostic[] = [];
  const builders: MutableTokenBuilder[] = [];

  // --- Phase A state ---
  let currentToken: MutableTokenBuilder | undefined = undefined;
  let pendingLeading: GreenTrivia[] = [];
  let seenNewline = false;
  let offset = 0;

  const versionHint = options.languageVersion ?? 'gspl-text/1.0';
  const resolved = resolveLanguageProfile(versionHint, limits);
  const profile: LexicalLanguageProfile = resolved.profile;
  for (const d of resolved.diagnostics as readonly LexicalDiagnostics[]) {
    pushDiagSafe(diagnostics, limits, d.code, d.message, 'error', source.id, 0, 0);
  }

  if (source.hadBom) {
    pendingLeading.push(GreenTrivia.fromText(SyntaxKind.ByteOrderMarkTrivia, String.fromCharCode(0xFEFF)));
  }

  function appendTrivia(trivia: readonly GreenTrivia[]): void {
    for (const tr of trivia) {
      if (seenNewline) {
        pendingLeading.push(tr);
      } else if (currentToken !== undefined) {
        currentToken.trailingTrivia.push(tr);
      } else {
        pendingLeading.push(tr);
      }
    }
  }

  function emit(kind: SyntaxKind, startOff: number, endOff: number, lexeme: string, semanticValue?: SemanticValue): void {
    if (builders.length >= limits.maxTokenCount) {
      pushDiagSafe(diagnostics, limits, 'GSPL-LEX-TOKEN-LIMIT', 'maxTokenCount exceeded', 'error', source.id, offset, offset);
      return;
    }
    const builder: MutableTokenBuilder = {
      kind,
      text: lexeme,
      startOffset: startOff,
      endOffset: endOff,
      leadingTrivia: pendingLeading,
      trailingTrivia: [],
      semanticValue,
    };
    builders.push(builder);
    currentToken = builder;
    pendingLeading = [];
    seenNewline = false;
  }

  while (offset < length) {
    if (builders.length >= limits.maxTokenCount) {
      pushDiagSafe(diagnostics, limits, 'GSPL-LEX-TOKEN-LIMIT', 'maxTokenCount exceeded', 'error', source.id, offset, offset);
      break;
    }
    if (diagnostics.length >= limits.maxDiagnostics) break;
    const startOffset = offset;
    const cp = text.charCodeAt(offset);
    // Whitespace (not newline)
    if (cp === 0x20 || cp === 0x09 || cp === 0x0B || cp === 0x0C) {
      const r = scanWhitespace(text, offset, false);
      appendTrivia(r.trivia);
      offset = r.nextOffset > startOffset ? r.nextOffset : startOffset + 1;
      continue;
    }
    // Newline forms (LF, CRLF, CR, U+2028, U+2029) — line terminator → leads next token.
    if (cp === 0x0A || cp === 0x0D || cp === 0x2028 || cp === 0x2029) {
      const r = scanWhitespace(text, offset, true);
      seenNewline = true;
      appendTrivia(r.trivia);
      offset = r.nextOffset > startOffset ? r.nextOffset : startOffset + 1;
      continue;
    }
    // Line comment
    if (cp === 0x2F && text.charCodeAt(offset + 1) === 0x2F) {
      const r = scanLineComment(text, offset, { sourceId: source.id, maxCommentCodeUnits: limits.maxCommentCodeUnits });
      for (const d of r.diagnostics) pushDiagByValue(diagnostics, limits, d);
      appendTrivia(r.trivia);
      offset = r.nextOffset > startOffset ? r.nextOffset : startOffset + 1;
      continue;
    }
    // Block comment
    if (cp === 0x2F && text.charCodeAt(offset + 1) === 0x2A) {
      const r = scanBlockComment(text, offset, {
        sourceId: source.id,
        limits,
        allowNestedBlockComments: nested && profile.allowNestedBlockComments !== false,
        maxCommentNestingDepth: profile.maxCommentNestingDepth || 64,
      });
      for (const d of r.diagnostics) pushDiagByValue(diagnostics, limits, d);
      appendTrivia(r.trivia);
      offset = r.nextOffset > startOffset ? r.nextOffset : startOffset + 1;
      continue;
    }
    // Numeric literal
    if (cp >= 0x30 && cp <= 0x39) {
      const result = scanNumericLiteral(text, offset, { sourceId: source.id, maxNumericCodeUnits: limits.maxNumericCodeUnits });
      for (const d of result.diagnostics) pushDiagByValue(diagnostics, limits, d);
      emit(result.kind, startOffset, startOffset + result.width, result.text, result.kind === SyntaxKind.Invalid ? undefined : result.semanticValue);
      offset = startOffset + result.width > startOffset ? startOffset + result.width : startOffset + 1;
      continue;
    }
    // String literal (including raw `r"..."` form).
    if (cp === 0x22 || (cp === 0x72 && text.charCodeAt(offset + 1) === 0x22)) {
      const result = scanStringLiteral(text, offset, { sourceId: source.id, maxStringCodeUnits: limits.maxStringCodeUnits });
      for (const d of result.diagnostics) pushDiagByValue(diagnostics, limits, d);
      const semValid = result.kind !== SyntaxKind.Invalid;
      emit(result.kind, startOffset, startOffset + result.width, result.text, semValid ? result.semanticValue : undefined);
      offset = startOffset + result.width > startOffset ? startOffset + result.width : startOffset + 1;
      continue;
    }
    // Identifier / keyword / literal
    if (isIdentStartCharCode(cp)) {
      const idResult = scanIdentifierOrKeyword(text, offset, limits.maxIdentifierCodeUnits);
      const lexeme = idResult.lexeme;
      if (!isPureAscii(lexeme) && lexeme.length > 0) {
        const idAnalysis = analyzeIdentifier(lexeme);
        for (const f of idAnalysis.findings) {
          pushDiagSafe(diagnostics, limits, f.code, f.message ?? f.code, 'warning', source.id, startOffset + (f.offset ?? 0), startOffset + (f.offset ?? 0) + 1);
        }
      }
      const lookup = lookupKeywordOrLiteral(lexeme, profile);
      let finalKind: SyntaxKind = SyntaxKind.Identifier;
      let semantic: SemanticValue | undefined;
      if (lookup) {
        finalKind = lookup.kind;
        if (lookup.category === 'literal') {
          if (lexeme === 'true') semantic = true;
          else if (lexeme === 'false') semantic = false;
          else semantic = null;
        }
      }
      emit(finalKind, startOffset, startOffset + idResult.width, lexeme, semantic);
      offset = startOffset + idResult.width > startOffset ? startOffset + idResult.width : startOffset + 1;
      continue;
    }
    // Punctuation / operator
    if (isPunctOrOpStart(cp)) {
      const r = scanPunctuationOrOperator(text, offset);
      const lexeme = text.slice(startOffset, startOffset + r.width);
      emit(r.kind, startOffset, startOffset + r.width, lexeme);
      offset = startOffset + r.width > startOffset ? startOffset + r.width : startOffset + 1;
      continue;
    }
    // Unrecognised byte/character — single Invalid token, one diagnostic.
    pushDiagSafe(diagnostics, limits, 'GSPL-LEX-INVALID-CHARACTER', 'unrecognized character: U+' + cp.toString(16).toUpperCase(), 'error', source.id, startOffset, startOffset + 1);
    emit(SyntaxKind.Invalid, startOffset, startOffset + 1, text[offset] ?? '');
    offset = startOffset + 1;
  }

  // EOF — Phase A emit. Its `leadingTrivia` receives whatever pending
  // leading trivia was left unowned by the loop. Phase B will freeze it.
  emit(SyntaxKind.EndOfFile, offset, offset, '');

  // --- Phase B: validate ownership-freeze and produce readonly Token[] ---
  const tokens = finalizePhaseB(builders, source.id);

  diagnostics.sort((a, b) => {
    // Prompt 3 Lexer Integrity Repair §12: primary = source logical identity
    // (single source per LexResult); then start offset; then end offset; then
    // severity rank (error < warning < info < hint); then code; then message.
    if (a.span.start !== b.span.start) return a.span.start - b.span.start;
    if (a.span.end !== b.span.end) return a.span.end - b.span.end;
    const sa = severityRank(a.severity);
    const sb = severityRank(b.severity);
    if (sa !== sb) return sa - sb;
    if (a.code !== b.code) return a.code < b.code ? -1 : 1;
    return a.message < b.message ? -1 : 1;
  });

  const startT = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const elapsed = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startT;
  const operational: LexerOperationalMetrics = { elapsedMs: elapsed };
  return {
    source,
    tokens,
    diagnostics,
    statistics: computeStats(tokens, diagnostics, source.lineCount),
    operational,
    complete: offset >= length,
  };
}

/**
 * Phase B — freeze the builder list into a readonly Token stream.
 * Each trivia array is copied to fresh storage and `Object.freeze`d.
 * The outer array is also frozen. The published `Token` never shares a
 * reference with any `MutableTokenBuilder` or any other public token's
 * trivia collection.
 */
function finalizePhaseB(builders: readonly MutableTokenBuilder[], sourceId: SourceId): readonly Token[] {
  const tokens: Token[] = builders.map((b) => ({
    greenToken: GreenToken.fromText(b.kind, b.text),
    leadingTrivia: Object.freeze([...b.leadingTrivia]) as readonly GreenTrivia[],
    trailingTrivia: Object.freeze([...b.trailingTrivia]) as readonly GreenTrivia[],
    span: { sourceId, start: b.startOffset, end: b.endOffset },
    semanticValue: b.semanticValue,
  }));
  return Object.freeze(tokens);
}

/**
 * Diagnostic emitter. Reserves the final remaining slot for
 * `GSPL-LEX-DIAGNOSTIC-LIMIT` so callers never bypass the configured limit.
 * `maxDiagnostics = 1` produces exactly one `GSPL-LEX-DIAGNOSTIC-LIMIT` and
 * discards everything else deterministically.
 */
function pushDiagSafe(
  diagnostics: Diagnostic[],
  limits: SourceLimits,
  code: string,
  message: string,
  severity: DiagnosticSeverity,
  sourceId: SourceId,
  start: number,
  end: number,
): void {
  const max = limits.maxDiagnostics;
  if (max <= 0) return;
  if (diagnostics.length >= max) return;
  if (diagnostics.length === max - 1) {
    diagnostics.push(makeDiagnostic({
      code: 'GSPL-LEX-DIAGNOSTIC-LIMIT',
      message: `Diagnostic emission capped at maxDiagnostics limit of ${max}`,
      severity: 'warning',
      span: { sourceId, start, end },
      category: 'lex',
      phase: 'lex',
      canonical: true,
    }));
    return;
  }
  diagnostics.push(makeDiagnostic({
    code, message, severity, span: { sourceId, start, end }, category: 'lex', phase: 'lex', canonical: true,
  }));
}

function pushDiagByValue(diagnostics: Diagnostic[], limits: SourceLimits, d: Diagnostic): void {
  pushDiagSafe(diagnostics, limits, d.code, d.message, d.severity, d.span.sourceId, d.span.start, d.span.end);
}

function isIdentStartCharCode(ch: number): boolean {
  // Profile-driven identifier recognition (§11). ASCII letters and underscore
  // are accepted by `isIdentifierStartChar` as well as accented Latin, Greek,
  // Cyrillic, CJK, etc., per the versioned Unicode profile. No handwritten
  // ranges.
  return isIdentifierStartChar(String.fromCharCode(ch));
}

function severityRank(s: DiagnosticSeverity): number {
  // DiagnosticSeverity = 'error' | 'warning' | 'info'. Rank errors first,
  // then warnings, then info. Anything unknown sorts last.
  switch (s) {
    case 'error': return 0;
    case 'warning': return 1;
    case 'info': return 2;
    default: return 3;
  }
}

function isPunctOrOpStart(ch: number): boolean {
  if ((ch >= 0x21 && ch <= 0x2F) || (ch >= 0x3A && ch <= 0x3F) || (ch >= 0x5B && ch <= 0x5E) || ch === 0x60 || (ch >= 0x7B && ch <= 0x7E)) return true;
  return false;
}

function isPureAscii(s: string): boolean {
  for (let i = 0; i < s.length; i++) if (s.charCodeAt(i) >= 0x80) return false;
  return true;
}

function computeStats(tokens: readonly Token[], diagnostics: readonly Diagnostic[], lineCount: number): LexerStatistics {
  let triviaCount = 0;
  let identCount = 0;
  let literalCount = 0;
  let keywordCount = 0;
  let opCount = 0;
  let punctCount = 0;
  let commentCount = 0;
  let invalidCount = 0;
  let maxTokenLength = 0;
  let totalTokenWidth = 0;
  let totalTriviaWidth = 0;
  for (const t of tokens) {
    triviaCount += t.leadingTrivia.length + t.trailingTrivia.length;
    for (const tr of t.leadingTrivia) totalTriviaWidth += tr.width;
    for (const tr of t.trailingTrivia) totalTriviaWidth += tr.width;
    if (t.greenToken.text.length > maxTokenLength) maxTokenLength = t.greenToken.text.length;
    totalTokenWidth += t.greenToken.width;
    const k = t.greenToken.kind;
    if (k === SyntaxKind.Identifier) identCount++;
    else if (k === SyntaxKind.IntegerLiteral || k === SyntaxKind.FloatLiteral || k === SyntaxKind.StringLiteral || k === SyntaxKind.RawStringLiteral || k === SyntaxKind.MultilineStringLiteral || k === SyntaxKind.BooleanLiteral || k === SyntaxKind.AbsenceLiteral || k === SyntaxKind.VersionLiteral || k === SyntaxKind.PathLiteral) literalCount++;
    else if (k === SyntaxKind.Invalid) invalidCount++;
    else if (isKeyword(k)) keywordCount++;
    else if (k >= SyntaxKind.Assign && k <= SyntaxKind.In) opCount++;
    else if (k >= SyntaxKind.LeftBrace && k <= SyntaxKind.Semicolon) punctCount++;
  }
  for (const t of tokens) {
    for (const tr of t.leadingTrivia) {
      if (isTrivia(tr.kind) && (tr.kind === SyntaxKind.LineCommentTrivia || tr.kind === SyntaxKind.BlockCommentTrivia || tr.kind === SyntaxKind.DocumentationCommentTrivia)) commentCount++;
    }
  }
  return {
    tokenCount: tokens.length, triviaCount, diagnosticCount: diagnostics.length,
    identifierCount: identCount, literalCount, keywordCount, operatorCount: opCount,
    punctuationCount: punctCount, commentCount, invalidCount,
    lineCount, maxTokenLength, totalTokenWidth, totalTriviaWidth,
  };
}
