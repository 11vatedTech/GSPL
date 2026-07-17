/**
 * Main lexer. Prompt 3 Final Lexer Closure.
 *
 * Two-phase architecture (Prompt 3 Lexer Integrity Repair §5 — retained).
 *
 * Multiline-comment ownership (Prompt 3 Final Closure §2):
 *   - Block comment OWNERSHIP is decided by whether the trivia's lexeme
 *     contains a supported line terminator (LF/CRLF/CR/U+2028/U+2029),
 *     not by the token-relative `seenNewline` flag at scan time.
 *   - Documentation comments ALWAYS lead the following token.
 *   - Otherwise the existing `seenNewline` rule applies.
 *
 * Trivia ordering invariant: `seenNewline` MUST be set to true before
 * `appendTrivia` is called, so that the existing line-terminator routing
 * rule (post-newline → `pendingLeading`) still triggers correctly for
 * pure whitespace newline forms. (Earlier draft had this in the wrong
 * order and broke §10 regression tests.)
 *
 * Code-point-aware identifier scanning (Prompt 3 Final Closure §4):
 *   - The main loop dispatcher `isIdentStartCharCode(cp)` accepts either
 *     ASCII letters or non-ASCII code points whose full scalar value
 *     passes the versioned profile (`isIdentifierStartChar`).
 *   - Supplementary-plane (U+10000+) code points emit
 *     `GSPL-LEX-SUPPLEMENTARY-IDENTIFIER`.
 *
 * Identifier metadata (Prompt 3 Final Closure §5): every identifier that
 * contains a non-ASCII code point carries an `IdentifierLexicalValue`.
 *
 * maxTriviaCodeUnits (Prompt 3 Final Closure §6-§7): once the configured
 * aggregate trivia ceiling is exceeded, the lexer emits one
 * `GSPL-LEX-TRIVIA-TOO-LARGE` diagnostic and stops materializing new
 * trivia GreenTrivia objects (offsets still advance; skipped byte count
 * is reported via `skippedTriviaCodeUnits`).
 */
import type { SourceDocument, SourceLimits, Diagnostic, SourceId, DiagnosticSeverity, IdentifierIdentity, UnicodeSecurityCode } from '@gspl/text-source';
import { DEFAULT_SOURCE_LIMITS, makeDiagnostic, analyzeIdentifier, isIdentifierStartChar } from '@gspl/text-source';
import { SyntaxKind, GreenToken, GreenTrivia, isKeyword, isTrivia } from '@gspl/syntax-tree';
import type { Token, LexResult, LexerStatistics, LexerOperationalMetrics, SemanticValue, IdentifierLexicalValue } from './token.js';
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

  let currentToken: MutableTokenBuilder | undefined = undefined;
  let pendingLeading: GreenTrivia[] = [];
  let seenNewline = false;
  let offset = 0;

  let triviaTotalCodeUnits = 0;
  let triviaLimitExceeded = false;
  let skippedTriviaCodeUnits = 0;

  const versionHint = options.languageVersion ?? 'gspl-text/1.0';
  const resolved = resolveLanguageProfile(versionHint, limits);
  const profile: LexicalLanguageProfile = resolved.profile;
  for (const d of resolved.diagnostics as readonly LexicalDiagnostics[]) {
    pushDiagSafe(diagnostics, limits, d.code, d.message, 'error', source.id, 0, 0);
  }

  if (source.hadBom) {
    pendingLeading.push(GreenTrivia.fromText(SyntaxKind.ByteOrderMarkTrivia, String.fromCharCode(0xFEFF)));
    triviaTotalCodeUnits += 1;
  }

  /**
   * Route trivia produced by a scanner. Documentation comments ALWAYS
   * lead. Multiline block comments (those whose lexeme contains a line
   * terminator) lead. Otherwise the existing `seenNewline` rule applies.
   *
   * `skipped=true` honours the trivia aggregate ceiling: we DO NOT append
   * the trivia but we still update `skippedTriviaCodeUnits` so property
   * tests can detect over-limit cases. The caller still owns offset
   * advancement.
   */
  function appendTrivia(
    trivia: readonly GreenTrivia[],
    containsLineTerminator: boolean,
    skipped: boolean,
  ): void {
    if (skipped) {
      for (const tr of trivia) skippedTriviaCodeUnits += tr.width;
      return;
    }
    for (const tr of trivia) {
      if (tr.kind === SyntaxKind.DocumentationCommentTrivia) {
        pendingLeading.push(tr);
        continue;
      }
      if (tr.kind === SyntaxKind.BlockCommentTrivia && containsLineTerminator) {
        pendingLeading.push(tr);
        continue;
      }
      if (seenNewline) {
        pendingLeading.push(tr);
      } else if (currentToken !== undefined) {
        currentToken.trailingTrivia.push(tr);
      } else {
        pendingLeading.push(tr);
      }
    }
    for (const tr of trivia) triviaTotalCodeUnits += tr.width;
    /* Trivia aggregate ceiling gate (Prompt 3 Final Closure §6-§7).
     * Located inside `appendTrivia` so greedy single-call scans still
     * trip it. Fires once the first time triviaTotalCodeUnits exceeds
     * the configured max. From then on every subsequent
     * `appendTrivia(...)` is routed through its `skipped=true` branch. */
    if (!triviaLimitExceeded && triviaTotalCodeUnits > limits.maxTriviaCodeUnits) {
      triviaLimitExceeded = true;
      pushDiagSafe(diagnostics, limits, 'GSPL-LEX-TRIVIA-TOO-LARGE', 'aggregate trivia exceeds maxTriviaCodeUnits: ' + triviaTotalCodeUnits + ' > ' + limits.maxTriviaCodeUnits, 'error', source.id, offset, offset);
    }
  }

  function emitToken(kind: SyntaxKind, startOff: number, endOff: number, lexeme: string, semanticValue?: SemanticValue): void {
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
    /* Trivia-limit gate moved INSIDE `appendTrivia` after triviaTotalCodeUnits
     * is updated — this catches greedy single-call scans (e.g.
     * `scanWhitespace(includeNewline=false)` over a long run of plain
     * spaces) that would otherwise consume the entire source in one
     * iteration and skip the gate entirely. */
    const startOffset = offset;
    const cp = text.charCodeAt(offset);

    /* Whitespace (not newline) */
    if (cp === 0x20 || cp === 0x09 || cp === 0x0B || cp === 0x0C) {
      const r = scanWhitespace(text, offset, false);
      appendTrivia(r.trivia, false, triviaLimitExceeded);
      offset = r.nextOffset > startOffset ? r.nextOffset : startOffset + 1;
      continue;
    }
    /* Newline forms — line terminator → leads next token. */
    if (cp === 0x0A || cp === 0x0D || cp === 0x2028 || cp === 0x2029) {
      const r = scanWhitespace(text, offset, true);
      seenNewline = true; /* SET FIRST so appendTrivia routes to pendingLeading. */
      appendTrivia(r.trivia, r.containsLineTerminator, triviaLimitExceeded);
      offset = r.nextOffset > startOffset ? r.nextOffset : startOffset + 1;
      continue;
    }
    /* Line comment */
    if (cp === 0x2F && text.charCodeAt(offset + 1) === 0x2F) {
      const r = scanLineComment(text, offset, { sourceId: source.id, maxCommentCodeUnits: limits.maxCommentCodeUnits });
      for (const d of r.diagnostics) pushDiagByValue(diagnostics, limits, d);
      if (r.containsLineTerminator) seenNewline = true;
      appendTrivia(r.trivia, false, triviaLimitExceeded);
      offset = r.nextOffset > startOffset ? r.nextOffset : startOffset + 1;
      continue;
    }
    /* Block comment */
    if (cp === 0x2F && text.charCodeAt(offset + 1) === 0x2A) {
      const r = scanBlockComment(text, offset, {
        sourceId: source.id,
        limits,
        allowNestedBlockComments: nested && profile.allowNestedBlockComments !== false,
        maxCommentNestingDepth: profile.maxCommentNestingDepth || limits.maxCommentNestingDepth,
      });
      for (const d of r.diagnostics) pushDiagByValue(diagnostics, limits, d);
      if (r.containsLineTerminator) seenNewline = true;
      appendTrivia(r.trivia, r.containsLineTerminator, triviaLimitExceeded);
      offset = r.nextOffset > startOffset ? r.nextOffset : startOffset + 1;
      continue;
    }
    /* Numeric literal */
    if (cp >= 0x30 && cp <= 0x39) {
      const result = scanNumericLiteral(text, offset, { sourceId: source.id, maxNumericCodeUnits: limits.maxNumericCodeUnits });
      for (const d of result.diagnostics) pushDiagByValue(diagnostics, limits, d);
      const semValid = result.kind !== SyntaxKind.Invalid;
      let sem: SemanticValue | undefined;
      if (semValid) {
        if (typeof result.semanticValue === 'bigint') sem = { kind: 'integer', value: result.semanticValue };
        else if (typeof result.semanticValue === 'string') sem = { kind: 'decimal-float', value: result.semanticValue };
      }
      emitToken(result.kind, startOffset, startOffset + result.width, result.text, sem);
      offset = startOffset + result.width > startOffset ? startOffset + result.width : startOffset + 1;
      continue;
    }
    /* String literal */
    if (cp === 0x22 || (cp === 0x72 && text.charCodeAt(offset + 1) === 0x22)) {
      const result = scanStringLiteral(text, offset, { sourceId: source.id, maxStringCodeUnits: limits.maxStringCodeUnits });
      for (const d of result.diagnostics) pushDiagByValue(diagnostics, limits, d);
      const semValid = result.kind !== SyntaxKind.Invalid;
      const sem: SemanticValue | undefined = semValid && typeof result.semanticValue === 'string'
        ? { kind: 'string', value: result.semanticValue }
        : undefined;
      emitToken(result.kind, startOffset, startOffset + result.width, result.text, sem);
      offset = startOffset + result.width > startOffset ? startOffset + result.width : startOffset + 1;
      continue;
    }
    /* Identifier / keyword / literal */
    if (isIdentStartCharCode(cp)) {
      const idResult = scanIdentifierOrKeyword(text, offset, limits.maxIdentifierCodeUnits);
      const lexeme = idResult.lexeme;
      if (idResult.rejectedSupplementary && lexeme.length > 0) {
        pushDiagSafe(diagnostics, limits, 'GSPL-LEX-SUPPLEMENTARY-IDENTIFIER', 'supplementary-plane identifier code point rejected by gspl-v1 profile', 'error', source.id, startOffset + lexeme.length, startOffset + lexeme.length + 2);
      }
      let semantic: SemanticValue | undefined;
      if (!isPureAscii(lexeme) && lexeme.length > 0) {
        const idAnalysis: IdentifierIdentity = analyzeIdentifier(lexeme);
        const findings = idAnalysis.findings.map((f) => ({ code: f.code as UnicodeSecurityCode, message: f.message }));
        for (const f of idAnalysis.findings) {
          pushDiagSafe(diagnostics, limits, f.code, f.message ?? f.code, 'warning', source.id, startOffset + (f.offset ?? 0), startOffset + (f.offset ?? 0) + 1);
        }
        const value: IdentifierLexicalValue = { kind: 'identifier', identity: idAnalysis, findings };
        semantic = value;
      }
      if (!semantic) {
        const lookup = lookupKeywordOrLiteral(lexeme, profile);
        if (lookup && lookup.category === 'literal') {
          if (lexeme === 'true') semantic = { kind: 'boolean', value: true };
          else if (lexeme === 'false') semantic = { kind: 'boolean', value: false };
          else semantic = { kind: 'absence' };
        }
      }
      emitToken(idResult.kind, startOffset, startOffset + idResult.width, lexeme, semantic);
      offset = startOffset + idResult.width > startOffset ? startOffset + idResult.width : startOffset + 1;
      continue;
    }
    /* Punctuation / operator */
    if (isPunctOrOpStart(cp)) {
      const r = scanPunctuationOrOperator(text, offset);
      const lexeme = text.slice(startOffset, startOffset + r.width);
      emitToken(r.kind, startOffset, startOffset + r.width, lexeme);
      offset = startOffset + r.width > startOffset ? startOffset + r.width : startOffset + 1;
      continue;
    }
    /* Unrecognised character */
    pushDiagSafe(diagnostics, limits, 'GSPL-LEX-INVALID-CHARACTER', 'unrecognized character: U+' + cp.toString(16).toUpperCase(), 'error', source.id, startOffset, startOffset + 1);
    emitToken(SyntaxKind.Invalid, startOffset, startOffset + 1, text[offset] ?? '');
    offset = startOffset + 1;
  }

  /* Final token. Mid-loop gate above already emitted
   * GSPL-LEX-TRIVIA-TOO-LARGE on the first over-limit iteration. */
  emitToken(SyntaxKind.EndOfFile, offset, offset, '');

  const tokens = finalizePhaseB(builders, source.id);

  diagnostics.sort((a, b) => {
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
  const stats = computeStats(tokens, diagnostics, source.lineCount, skippedTriviaCodeUnits);
  return {
    source,
    tokens,
    diagnostics,
    statistics: stats,
    operational,
    complete: offset >= length && !triviaLimitExceeded,
  };
}

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
      category: 'lex', phase: 'lex', canonical: true,
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

/**
 * Main-loop dispatcher: should we try to scan this character as an
 * identifier start? Returns true for ASCII letters/underscore OR for any
 * non-ASCII code point whose Unicode scalar value passes the versioned
 * profile OR for either surrogate half (so the scanner can validate the
 * full pair and reject unpaired halves). Identifiers are then scanned by
 * `scanIdentifierOrKeyword`, which is code-point-aware and either accepts
 * or rejects supplementary characters.
 */
function isIdentStartCharCode(ch: number): boolean {
  if (ch < 0x80) {
    /* ASCII fast path: letter or underscore only. */
    if (ch === 0x5F) return true;
    if (ch >= 0x41 && ch <= 0x5A) return true;
    if (ch >= 0x61 && ch <= 0x7A) return true;
    return false;
  }
  /* Both halves route into the identifier scanner so it can perform
   * surrogate-pair detection and supplementary-plane rejection. */
  if (ch >= 0xD800 && ch <= 0xDFFF) return true;
  return isIdentifierStartChar(String.fromCharCode(ch));
}

function severityRank(s: DiagnosticSeverity): number {
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

function computeStats(tokens: readonly Token[], diagnostics: readonly Diagnostic[], lineCount: number, skippedTriviaCodeUnits: number): LexerStatistics {
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
    for (const tr of t.trailingTrivia) {
      if (isTrivia(tr.kind) && (tr.kind === SyntaxKind.LineCommentTrivia || tr.kind === SyntaxKind.BlockCommentTrivia || tr.kind === SyntaxKind.DocumentationCommentTrivia)) commentCount++;
    }
  }
  return {
    tokenCount: tokens.length, triviaCount, diagnosticCount: diagnostics.length,
    identifierCount: identCount, literalCount, keywordCount, operatorCount: opCount,
    punctuationCount: punctCount, commentCount, invalidCount,
    lineCount, maxTokenLength, totalTokenWidth, totalTriviaWidth,
    skippedTriviaCodeUnits,
  };
}
