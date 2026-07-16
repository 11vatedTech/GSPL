/**
 * Main lexer. Prompt 3 Sections 12, 13, 14, 20, 21, 6.
 *
 * Trivia ownership policy (Prompt 3 §3 / §6 — MutableTokenBuilder architecture):
 *   - Track `lastBuilder` separately from the published immutable Token stream.
 *   - Same-line whitespace, same-line line comments, and same-line block
 *     comments are appended to `lastBuilder.trailing` (or, when no token has
 *     yet been emitted, into the brand-new token's leading trivia via the
 *     same mechanism).
 *   - Newline forms (LF, CRLF, CR, U+2028, U+2029) and the lineage of trivia
 *     after them switch to leading-trivia collection for the next token.
 *   - BOM becomes the first token's leading trivia.
 *   - EOF owns any unowned leading trivia after the source is exhausted.
 *
 * Unicode security (Prompt 3 §4): every identifier is analysed through
 * @gspl/text-source analyzeIdentifier. Plain-ASCII identifiers go through an
 * ASCII fast path that produces no warnings (Prompt 3 §12).
 *
 * Keyword / literal boundary recognition (Prompt 3 §3 / §6): single
 * authoritative `lookupKeywordOrLiteral` against the language profile.
 *
 * Diagnostic limit (Prompt 3 §11): every diagnostic emission is funnelled
 * through `pushDiag`. Once `limits.maxDiagnostics` is reached, the helper
 * silently drops subsequent emissions to keep the result bounded.
 */
import type { SourceDocument, SourceLimits, Diagnostic, SourceId, DiagnosticSeverity } from '@gspl/text-source';
import { DEFAULT_SOURCE_LIMITS, makeDiagnostic, analyzeIdentifier } from '@gspl/text-source';
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

/** Mutable token builder — internal. The published Token never shares this. */
interface MutableBuilder {
  readonly startOffset: number;
  endOffset: number;
  kind: SyntaxKind;
  text: string;
  leading: GreenTrivia[];
  trailing: GreenTrivia[];
  semanticValue?: SemanticValue;
}

/** Two-phase architecture: collect → freeze into immutable Token. */
function finalize(b: MutableBuilder, sourceId: SourceId): Token {
  return {
    greenToken: GreenToken.fromText(b.kind, b.text),
    leadingTrivia: b.leading,
    trailingTrivia: b.trailing,
    span: { sourceId, start: b.startOffset, end: b.endOffset },
    semanticValue: b.semanticValue,
  };
}

export function lexSource(source: SourceDocument, options: LexerOptions = {}): LexResult {
  const limits = options.limits ?? DEFAULT_SOURCE_LIMITS;
  const nested = options.nestedBlockComments ?? true;
  const text = source.text;
  const length = text.length;
  const tokens: Token[] = [];
  const diagnostics: Diagnostic[] = [];

  const versionHint = options.languageVersion ?? 'gspl-text/1.0';
  const resolved = resolveLanguageProfile(versionHint, limits);
  const profile: LexicalLanguageProfile = resolved.profile;
  for (const d of resolved.diagnostics as readonly LexicalDiagnostics[]) {
    pushDiag(diagnostics, limits, d.code, d.message, 'error', source, 0, 0);
  }

  // Mutable builder for the most recently emitted token (null until first emit).
  let lastBuilder: MutableBuilder | null = null;
  // Trailing trivia that has not yet been committed to a builder.
  let pendingTrailing: GreenTrivia[] = [];
  // Trivia accumulated for the NEXT builder's leading position.
  let pendingLeading: GreenTrivia[] = [];
  // Newline seen flag — gates whether follow-on trivia is leading or trailing.
  let seenNewline: boolean = false;

  if (source.hadBom) {
    pendingLeading.push(GreenTrivia.fromText(SyntaxKind.ByteOrderMarkTrivia, String.fromCharCode(0xFEFF)));
  }

  let offset = 0;

  function commitPendingTrailing(): void {
    if (lastBuilder !== null && pendingTrailing.length > 0) {
      lastBuilder.trailing = pendingTrailing;
    } else {
      // No preceding builder yet: pendingTrailing becomes leading if first
      // trivia in file. Else just drop (degenerate case).
      if (lastBuilder === null && pendingLeading.length === 0) {
        pendingLeading = pendingTrailing;
      }
    }
    pendingTrailing = [];
  }

  function emit(kind: SyntaxKind, startOff: number, endOff: number, lexeme: string, semanticValue?: SemanticValue): void {
    if (tokens.length >= limits.maxTokenCount) {
      pushDiag(diagnostics, limits, 'GSPL-LEX-TOKEN-LIMIT', 'maxTokenCount exceeded', 'error', source, offset, offset);
      return;
    }
    commitPendingTrailing();
    const builder: MutableBuilder = {
      startOffset: startOff,
      endOffset: endOff,
      kind,
      text: lexeme,
      leading: pendingLeading,
      trailing: [],
      semanticValue,
    };
    pendingLeading = [];
    seenNewline = false;
    lastBuilder = builder;
    tokens.push(finalize(builder, source.id));
  }

  while (offset < length) {
    if (tokens.length >= limits.maxTokenCount) {
      pushDiag(diagnostics, limits, 'GSPL-LEX-TOKEN-LIMIT', 'maxTokenCount exceeded', 'error', source, offset, offset);
      break;
    }
    if (diagnostics.length >= limits.maxDiagnostics) break;
    const startOffset = offset;
    const cp = text.charCodeAt(offset);
    // Whitespace (not newline)
    if (cp === 0x20 || cp === 0x09 || cp === 0x0B || cp === 0x0C) {
      const r = scanWhitespace(text, offset, false);
      if (seenNewline) {
        for (const tr of r.trivia) pendingLeading.push(tr);
      } else if (lastBuilder !== null) {
        // Same-line whitespace after a token → trailing of last builder.
        for (const tr of r.trivia) pendingTrailing.push(tr);
      } else {
        // Pre-first-token whitespace → leading of next token.
        for (const tr of r.trivia) pendingLeading.push(tr);
      }
      offset = r.nextOffset;
      if (offset <= startOffset) offset = startOffset + 1;
      continue;
    }
    // Newline forms (LF, CR, CRLF, U+2028, U+2029) — line terminator → leads next token.
    if (cp === 0x0A || cp === 0x0D || cp === 0x2028 || cp === 0x2029) {
      if (lastBuilder !== null) {
        commitPendingTrailing();
      }
      const r = scanWhitespace(text, offset, true);
      for (const tr of r.trivia) pendingLeading.push(tr);
      seenNewline = true;
      offset = r.nextOffset;
      if (offset <= startOffset) offset = startOffset + 1;
      continue;
    }
    // Line comment
    if (cp === 0x2F && text.charCodeAt(offset + 1) === 0x2F) {
      const r = scanLineComment(text, offset, { sourceId: source.id, maxCommentCodeUnits: limits.maxCommentCodeUnits });
      for (const d of r.diagnostics) {
        pushDiagnostic(diagnostics, limits, d, source);
      }
      if (seenNewline) {
        for (const tr of r.trivia) pendingLeading.push(tr);
      } else if (lastBuilder !== null) {
        for (const tr of r.trivia) pendingTrailing.push(tr);
      } else {
        for (const tr of r.trivia) pendingLeading.push(tr);
      }
      offset = r.nextOffset;
      if (offset <= startOffset) offset = startOffset + 1;
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
      for (const d of r.diagnostics) {
        pushDiagnostic(diagnostics, limits, d, source);
      }
      if (seenNewline) {
        for (const tr of r.trivia) pendingLeading.push(tr);
      } else if (lastBuilder !== null) {
        for (const tr of r.trivia) pendingTrailing.push(tr);
      } else {
        for (const tr of r.trivia) pendingLeading.push(tr);
      }
      offset = r.nextOffset;
      if (offset <= startOffset) offset = startOffset + 1;
      continue;
    }
    // Numeric literal
    if (cp >= 0x30 && cp <= 0x39) {
      const result = scanNumericLiteral(text, offset, { sourceId: source.id, maxNumericCodeUnits: limits.maxNumericCodeUnits });
      for (const d of result.diagnostics) pushDiagnostic(diagnostics, limits, d, source);
      emit(result.kind, startOffset, startOffset + result.width, result.text, result.kind === SyntaxKind.Invalid ? undefined : result.semanticValue);
      offset = startOffset + result.width;
      if (offset <= startOffset) offset = startOffset + 1;
      continue;
    }
    // String literal
    if (cp === 0x22 || (cp === 0x72 && text.charCodeAt(offset + 1) === 0x22)) {
      const result = scanStringLiteral(text, offset, { sourceId: source.id, maxStringCodeUnits: limits.maxStringCodeUnits });
      for (const d of result.diagnostics) pushDiagnostic(diagnostics, limits, d, source);
      const semValid = result.kind !== SyntaxKind.Invalid;
      emit(result.kind, startOffset, startOffset + result.width, result.text, semValid ? result.semanticValue : undefined);
      offset = startOffset + result.width;
      if (offset <= startOffset) offset = startOffset + 1;
      continue;
    }
    // Identifier / keyword / literal
    if (isIdentStartCharCode(cp)) {
      const idResult = scanIdentifierOrKeyword(text, offset, limits.maxIdentifierCodeUnits);
      const lexeme = idResult.lexeme;
      if (!isPureAscii(lexeme) && lexeme.length > 0) {
        const idAnalysis = analyzeIdentifier(lexeme);
        for (const f of idAnalysis.findings) {
          pushDiag(diagnostics, limits, f.code, f.message ?? f.code, 'warning', source, startOffset + (f.offset ?? 0), startOffset + (f.offset ?? 0) + 1);
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
      offset = startOffset + idResult.width;
      if (offset <= startOffset) offset = startOffset + 1;
      continue;
    }
    // Punctuation / operator
    if (isPunctOrOpStart(cp)) {
      const r = scanPunctuationOrOperator(text, offset);
      const lexeme = text.slice(startOffset, startOffset + r.width);
      emit(r.kind, startOffset, startOffset + r.width, lexeme);
      offset = startOffset + r.width;
      if (offset <= startOffset) offset = startOffset + 1;
      continue;
    }
    // Unrecognised byte/character — single Invalid token, one diagnostic.
    pushDiag(diagnostics, limits, 'GSPL-LEX-INVALID-CHARACTER', 'unrecognized character: U+' + cp.toString(16).toUpperCase(), 'error', source, startOffset, startOffset + 1);
    emit(SyntaxKind.Invalid, startOffset, startOffset + 1, text[offset] ?? '');
    offset = startOffset + 1;
  }
  // EOF owns any unowned leading trivia (Prompt 3 §3 / §6). Pending trailing
  // trivia is integrated exactly once into the EOF builder's leading trivia.
  // We do NOT also assign it back to `lastBuilder.trailing` — doing so would
  // double-count unowned trailing trivia and break token-stream reconstruction
  // for sources ending with same-line trailing whitespace or a same-line
  // trailing comment.
  const eofBuilder: MutableBuilder = {
    startOffset: offset,
    endOffset: offset,
    kind: SyntaxKind.EndOfFile,
    text: '',
    leading: [...pendingLeading, ...pendingTrailing],
    trailing: [],
  };
  pendingLeading = [];
  pendingTrailing = [];
  tokens.push(finalize(eofBuilder, source.id));

  diagnostics.sort((a, b) => {
    if (a.code !== b.code) return a.code < b.code ? -1 : 1;
    return a.span.start - b.span.start;
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

function pushDiag(
  diagnostics: Diagnostic[],
  limits: SourceLimits,
  code: string,
  message: string,
  severity: DiagnosticSeverity,
  source: SourceDocument,
  start: number,
  end: number,
): void {
  if (diagnostics.length >= limits.maxDiagnostics) return;
  diagnostics.push(makeDiagnostic({ code, message, severity, span: { sourceId: source.id, start, end }, category: 'lex', phase: 'lex', canonical: true }));
}

function pushDiagnostic(
  diagnostics: Diagnostic[],
  limits: SourceLimits,
  d: Diagnostic,
  source: SourceDocument,
): void {
  if (diagnostics.length >= limits.maxDiagnostics) return;
  diagnostics.push(d);
}

function isIdentStartCharCode(ch: number): boolean {
  if (ch === 0x5F) return true;
  if ((ch >= 0x41 && ch <= 0x5A) || (ch >= 0x61 && ch <= 0x7A)) return true;
  if (ch >= 0x00C0 && ch <= 0x024F) return true;
  return false;
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
