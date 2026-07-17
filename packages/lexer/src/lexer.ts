/**
 * Main lexer. Prompt 3 Final Unlock.
 *
 * Two-phase architecture (Prompt 3 Lexer Integrity Repair §5 — retained):
 *   Phase A — mutable construction. Phase B — freeze-and-copy publication.
 *
 * Multiline-comment ownership (Prompt 3 Final Closure §2 — retained).
 *
 * Code-point-aware scanning (Prompt 3 Final Unlock §3): the main loop
 * reads Unicode scalar values via `@gspl/lexer/src/codepoint.ts`'s
 * single authoritative `readSourceCodePoint` boundary. No
 * `text.charCodeAt(offset)` direct calls remain in production code.
 *
 * Supplementary-at-start recovery contract (Final Unlock §4): a
 * supplementary-plane code point at the START of any token produces
 * EXACTLY ONE `GSPL-LEX-SUPPLEMENTARY-IDENTIFIER` diagnostic, a single
 * Invalid token of width 2 spanning the FULL scalar, and the lexer
 * advances by 2 UTF-16 units. Adjacent identifier characters form
 * separate Identifier tokens starting at offset+2.
 *
 * Unpaired-surrogate diagnostics (Final Unlock §5): every unpaired high
 * or low surrogate anywhere in the source produces a single
 * `GSPL-SOURCE-UNPAIRED-SURROGATE` diagnostic with span covering
 * exactly one UTF-16 unit. The lexer routes the offending code unit
 * through an Invalid token of width 1 and continues lexing.
 *
 * ASCII identifier metadata (Final Unlock §6): EVERY identifier —
 * ASCII or not — carries `IdentifierLexicalValue` metadata with
 * original spelling, NFC normalization, ASCII confusable skeleton,
 * script set, and findings array (empty for ASCII).
 *
 * Aggregate trivia limit (Prompt 3 Final Closure §6-§7 — retained):
 * `maxTriviaCodeUnits` enforced inside `appendTrivia` post-increment.
 * Sticky !triviaLimitExceeded guard fires the diagnostic exactly once.
 */
import type { SourceDocument, SourceLimits, Diagnostic, SourceId, DiagnosticSeverity, IdentifierIdentity, UnicodeSecurityCode } from '@gspl/text-source';
import { DEFAULT_SOURCE_LIMITS, makeDiagnostic, analyzeIdentifier, checkForbiddenControls, isIdentifierStartChar } from '@gspl/text-source';
import { SyntaxKind, GreenToken, GreenTrivia, isKeyword, isTrivia } from '@gspl/syntax-tree';
import type { Token, LexResult, LexerStatistics, LexerOperationalMetrics, SemanticValue, IdentifierLexicalValue } from './token.js';
import { scanNumericLiteral } from './lex-numeric.js';
import { scanStringLiteral } from './lex-string.js';
import { scanLineComment, scanBlockComment, scanWhitespace } from './lex-comment.js';
import { scanIdentifierOrKeyword, scanPunctuationOrOperator } from './keyword.js';
import { readSourceCodePoint } from './codepoint.js';
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
  spelling?: string;
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

  if (source.hadBom && offset < length) {
    pendingLeading.push(GreenTrivia.fromText(SyntaxKind.ByteOrderMarkTrivia, String.fromCharCode(0xFEFF)));
    triviaTotalCodeUnits += 1;
  }

  /* Final Unlock §5: pre-scan entire text for unpaired surrogates + forbidden
   * control / bidi / zero-width / default-ignorable characters. The
   * `checkForbiddenControls` function emits `GSPL-SOURCE-UNPAIRED-SURROGATE`
   * for unpaired surrogate halves; the corresponding byte is then routed
   * through the lexer's main loop as a 1-width Invalid token rather than
   * absorbed into an identifier or string lexeme. */
  const controlFindings = checkForbiddenControls(text);
  /* Push surrogate findings here so their span positions are stable and
   * duplicate emissions from analyzeIdentifier are suppressed below. */
  const seenSpans = new Set<string>();
  for (const f of controlFindings.findings) {
    if (f.code === 'GSPL-SOURCE-UNPAIRED-SURROGATE') {
      const key = f.offset + ':' + (f.offset + 1);
      if (seenSpans.has(key)) continue;
      seenSpans.add(key);
      pushDiagSafe(diagnostics, limits, f.code, f.message ?? f.code, 'error', source.id, f.offset, f.offset + 1);
    }
  }

  function appendTrivia(trivia: readonly GreenTrivia[], containsLineTerminator: boolean, skipped: boolean): void {
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
      if (seenNewline) pendingLeading.push(tr);
      else if (currentToken !== undefined) currentToken.trailingTrivia.push(tr);
      else pendingLeading.push(tr);
    }
    for (const tr of trivia) triviaTotalCodeUnits += tr.width;
    if (!triviaLimitExceeded && triviaTotalCodeUnits > limits.maxTriviaCodeUnits) {
      triviaLimitExceeded = true;
      pushDiagSafe(diagnostics, limits, 'GSPL-LEX-TRIVIA-TOO-LARGE', 'aggregate trivia exceeds maxTriviaCodeUnits: ' + triviaTotalCodeUnits + ' > ' + limits.maxTriviaCodeUnits, 'error', source.id, offset, offset);
    }
  }

  function emitToken(kind: SyntaxKind, startOff: number, endOff: number, lexeme: string, semanticValue?: SemanticValue, spelling?: string): void {
    if (builders.length >= limits.maxTokenCount) {
      pushDiagSafe(diagnostics, limits, 'GSPL-LEX-TOKEN-LIMIT', 'maxTokenCount exceeded', 'error', source.id, offset, offset);
      return;
    }
    const builder: MutableTokenBuilder = {
      kind, text: lexeme, startOffset: startOff, endOffset: endOff,
      leadingTrivia: pendingLeading, trailingTrivia: [], semanticValue, spelling,
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

    /* Read full Unicode scalar value via the authoritative boundary. */
    const cpRead = readSourceCodePoint(text, offset);

    /* Whitespace (not newline). */
    if (cpRead.codePoint !== undefined && !cpRead.unpairedSurrogate) {
      const cp = cpRead.codePoint;
      if (cp === 0x20 || cp === 0x09 || cp === 0x0B || cp === 0x0C) {
        const r = scanWhitespace(text, offset, false);
        appendTrivia(r.trivia, false, triviaLimitExceeded);
        offset = r.nextOffset > startOffset ? r.nextOffset : startOffset + 1;
        continue;
      }
      if (cp === 0x0A || cp === 0x0D || cp === 0x2028 || cp === 0x2029) {
        const r = scanWhitespace(text, offset, true);
        seenNewline = true;
        appendTrivia(r.trivia, r.containsLineTerminator, triviaLimitExceeded);
        offset = r.nextOffset > startOffset ? r.nextOffset : startOffset + 1;
        continue;
      }
    }

    /* Unpaired surrogate — surface as Invalid token of width 1.
     * The diagnostic has already been emitted in the pre-scan above
     * (`GSPL-SOURCE-UNPAIRED-SURROGATE`); do not re-emit. */
    if (cpRead.unpairedSurrogate) {
      emitToken(SyntaxKind.Invalid, startOffset, startOffset + 1, text[offset] ?? '');
      offset = startOffset + 1;
      continue;
    }

    /* Line comment */
    if (cpRead.codePoint === 0x2F && text.charCodeAt(offset + 1) === 0x2F) {
      const r = scanLineComment(text, offset, { sourceId: source.id, maxCommentCodeUnits: limits.maxCommentCodeUnits });
      for (const d of r.diagnostics) pushDiagByValue(diagnostics, limits, d);
      if (r.containsLineTerminator) seenNewline = true;
      appendTrivia(r.trivia, false, triviaLimitExceeded);
      offset = r.nextOffset > startOffset ? r.nextOffset : startOffset + 1;
      continue;
    }

    /* Block comment */
    if (cpRead.codePoint === 0x2F && text.charCodeAt(offset + 1) === 0x2A) {
      const r = scanBlockComment(text, offset, {
        sourceId: source.id, limits,
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
    if (cpRead.codePoint !== undefined && cpRead.codePoint >= 0x30 && cpRead.codePoint <= 0x39) {
      const result = scanNumericLiteral(text, offset, { sourceId: source.id, maxNumericCodeUnits: limits.maxNumericCodeUnits });
      for (const d of result.diagnostics) pushDiagByValue(diagnostics, limits, d);
      let sem: SemanticValue | undefined;
      if (result.kind !== SyntaxKind.Invalid) {
        if (typeof result.semanticValue === 'bigint') {
          sem = { kind: 'integer', value: result.semanticValue };
        } else if (typeof result.semanticValue === 'string') {
          sem = { kind: 'decimal-float', value: result.semanticValue, negativeZero: result.negativeZero === true };
        }
      }
      emitToken(result.kind, startOffset, startOffset + result.width, result.text, sem);
      offset = startOffset + result.width > startOffset ? startOffset + result.width : startOffset + 1;
      continue;
    }

    /* String literal (escaped `"..."` or raw `r"..."`). */
    if (cpRead.codePoint === 0x22 || (cpRead.codePoint === 0x72 && text.charCodeAt(offset + 1) === 0x22)) {
      const result = scanStringLiteral(text, offset, { sourceId: source.id, maxStringCodeUnits: limits.maxStringCodeUnits });
      for (const d of result.diagnostics) pushDiagByValue(diagnostics, limits, d);
      const sem: SemanticValue | undefined = result.kind !== SyntaxKind.Invalid && typeof result.semanticValue === 'string'
        ? { kind: 'string', value: result.semanticValue }
        : undefined;
      emitToken(result.kind, startOffset, startOffset + result.width, result.text, sem);
      offset = startOffset + result.width > startOffset ? startOffset + result.width : startOffset + 1;
      continue;
    }

    /* Identifier / keyword / literal / supplementary-at-start. */
    if (cpRead.codePoint !== undefined && (cpRead.utf16Width === 2 || isIdentifierStartFast(text.charCodeAt(offset)))) {
      const idResult = scanIdentifierOrKeyword(text, offset, limits.maxIdentifierCodeUnits);

      /* Final Unlock §4 — supplementary at identifier start. */
      if (idResult.rejectedSupplementary && idResult.lexeme.length === 0) {
        /* The supplementary char is at the START and there are no
         * accepted identifier characters before it. Emit EXACTLY ONE
         * diagnostic with span covering the full 2 UTF-16 units. */
        pushDiagSafe(diagnostics, limits, 'GSPL-LEX-SUPPLEMENTARY-IDENTIFIER', 'supplementary-plane identifier code point rejected by gspl-v1 profile', 'error', source.id, startOffset, startOffset + 2);
        emitToken(SyntaxKind.Invalid, startOffset, startOffset + 2, text.slice(startOffset, startOffset + 2));
        offset = startOffset + 2;
        continue;
      }
      if (idResult.rejectedSupplementary && idResult.lexeme.length > 0) {
        /* Supplementary char appeared mid-identifier; the lexeme is the
         * accepted prefix. Emit one diagnostic for the supplementary
         * scalar against its exact position. */
        pushDiagSafe(diagnostics, limits, 'GSPL-LEX-SUPPLEMENTARY-IDENTIFIER', 'supplementary-plane identifier code point rejected by gspl-v1 profile', 'error', source.id, startOffset + idResult.lexeme.length, startOffset + idResult.lexeme.length + 2);
        /* Emit the accepted prefix as Identifier, then continue loop
         * (will encounter the supplementary char in next iteration). */
      }

      const lexeme = idResult.lexeme;
      if (lexeme.length > 0) {
        /* Final Unlock §6: ASCII OR non-ASCII — every identifier carries
         * `IdentifierLexicalValue` metadata with original/normalized/
         * skeleton/scripts/findings. */
        const idAnalysis: IdentifierIdentity = analyzeIdentifier(lexeme);
        /* Suppress duplicate UNPAIRED-SURROGATE findings: pre-scan already
         * emitted one per occurrence. */
        const filteredFindings = idAnalysis.findings.filter((f) => f.code !== 'GSPL-SOURCE-UNPAIRED-SURROGATE');
        for (const f of filteredFindings) {
          pushDiagSafe(diagnostics, limits, f.code, f.message ?? f.code, 'warning', source.id, startOffset + (f.offset ?? 0), startOffset + (f.offset ?? 0) + 1);
        }
        const idMeta: IdentifierLexicalValue = { kind: 'identifier', identity: idAnalysis, findings: filteredFindings };

        let semantic: SemanticValue = idMeta;
        /* Boolean / absence override for literal keywords (still emit
         * length-suppressed identifier metadata per §6 — keywords carry
         * Spelling field so callers recover spelling). */
        const lookup = lookupKeywordOrLiteral(lexeme, profile);
        if (lookup && lookup.category === 'literal') {
          if (lexeme === 'true') semantic = { kind: 'boolean', value: true };
          else if (lexeme === 'false') semantic = { kind: 'boolean', value: false };
          else semantic = { kind: 'absence' };
        }
        emitToken(idResult.kind, startOffset, startOffset + idResult.width, lexeme, semantic, lexeme);
        offset = startOffset + idResult.width > startOffset ? startOffset + idResult.width : startOffset + 1;
        continue;
      }
    }

    /* Punctuation / operator */
    if (cpRead.codePoint !== undefined && isPunctOrOpStart(cpRead.codePoint)) {
      const r = scanPunctuationOrOperator(text, offset);
      const lexeme = text.slice(startOffset, startOffset + r.width);
      emitToken(r.kind, startOffset, startOffset + r.width, lexeme);
      offset = startOffset + r.width > startOffset ? startOffset + r.width : startOffset + 1;
      continue;
    }

    /* Unrecognised character — single Invalid token + diagnostic. */
    if (cpRead.codePoint !== undefined) {
      pushDiagSafe(diagnostics, limits, 'GSPL-LEX-INVALID-CHARACTER', 'unrecognized character: U+' + cpRead.codePoint.toString(16).toUpperCase(), 'error', source.id, startOffset, startOffset + cpRead.utf16Width);
      emitToken(SyntaxKind.Invalid, startOffset, startOffset + cpRead.utf16Width, text.slice(startOffset, startOffset + cpRead.utf16Width));
      offset = startOffset + cpRead.utf16Width;
    } else {
      /* Defensive single-code-unit progress. */
      offset = startOffset + 1;
    }
  }

  /* Final token. */
  emitToken(SyntaxKind.EndOfFile, offset, offset, '');

  const tokens = finalizePhaseB(builders, source.id);
  diagnostics.sort(diagnosticSortCompare);
  const startT = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const elapsed = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startT;
  const operational: LexerOperationalMetrics = { elapsedMs: elapsed };
  const stats = computeStats(tokens, diagnostics, source.lineCount, skippedTriviaCodeUnits);
  return { source, tokens, diagnostics, statistics: stats, operational, complete: offset >= length && !triviaLimitExceeded };
}

function finalizePhaseB(builders: readonly MutableTokenBuilder[], sourceId: SourceId): readonly Token[] {
  const tokens: Token[] = builders.map((b) => ({
    greenToken: GreenToken.fromText(b.kind, b.text),
    leadingTrivia: Object.freeze([...b.leadingTrivia]) as readonly GreenTrivia[],
    trailingTrivia: Object.freeze([...b.trailingTrivia]) as readonly GreenTrivia[],
    span: { sourceId, start: b.startOffset, end: b.endOffset },
    semanticValue: b.semanticValue,
    spelling: b.spelling,
  }));
  return Object.freeze(tokens);
}

function pushDiagSafe(diagnostics: Diagnostic[], limits: SourceLimits, code: string, message: string, severity: DiagnosticSeverity, sourceId: SourceId, start: number, end: number): void {
  const max = limits.maxDiagnostics;
  if (max <= 0) return;
  if (diagnostics.length >= max) return;
  if (diagnostics.length === max - 1) {
    diagnostics.push(makeDiagnostic({ code: 'GSPL-LEX-DIAGNOSTIC-LIMIT', message: `Diagnostic emission capped at maxDiagnostics limit of ${max}`, severity: 'warning', span: { sourceId, start, end }, category: 'lex', phase: 'lex', canonical: true }));
    return;
  }
  diagnostics.push(makeDiagnostic({ code, message, severity, span: { sourceId, start, end }, category: 'lex', phase: 'lex', canonical: true }));
}

function pushDiagByValue(diagnostics: Diagnostic[], limits: SourceLimits, d: Diagnostic): void {
  pushDiagSafe(diagnostics, limits, d.code, d.message, d.severity, d.span.sourceId, d.span.start, d.span.end);
}

const diagnosticSortCompare = (a: Diagnostic, b: Diagnostic): number => {
  if (a.span.start !== b.span.start) return a.span.start - b.span.start;
  if (a.span.end !== b.span.end) return a.span.end - b.span.end;
  const sa = severityRank(a.severity);
  const sb = severityRank(b.severity);
  if (sa !== sb) return sa - sb;
  if (a.code !== b.code) return a.code < b.code ? -1 : 1;
  return a.message < b.message ? -1 : 1;
};

function isIdentifierStartFast(ch: number): boolean {
  if (ch === 0x5F) return true;
  if (ch >= 0x41 && ch <= 0x5A) return true;
  if (ch >= 0x61 && ch <= 0x7A) return true;
  return false;
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

function computeStats(tokens: readonly Token[], diagnostics: readonly Diagnostic[], lineCount: number, skippedTriviaCodeUnits: number): LexerStatistics {
  let triviaCount = 0, identCount = 0, literalCount = 0, keywordCount = 0, opCount = 0, punctCount = 0, commentCount = 0, invalidCount = 0;
  let maxTokenLength = 0, totalTokenWidth = 0, totalTriviaWidth = 0;
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
    for (const tr of t.leadingTrivia) if (isTrivia(tr.kind) && (tr.kind === SyntaxKind.LineCommentTrivia || tr.kind === SyntaxKind.BlockCommentTrivia || tr.kind === SyntaxKind.DocumentationCommentTrivia)) commentCount++;
    for (const tr of t.trailingTrivia) if (isTrivia(tr.kind) && (tr.kind === SyntaxKind.LineCommentTrivia || tr.kind === SyntaxKind.BlockCommentTrivia || tr.kind === SyntaxKind.DocumentationCommentTrivia)) commentCount++;
  }
  return {
    tokenCount: tokens.length, triviaCount, diagnosticCount: diagnostics.length,
    identifierCount: identCount, literalCount, keywordCount, operatorCount: opCount,
    punctuationCount: punctCount, commentCount, invalidCount,
    lineCount, maxTokenLength, totalTokenWidth, totalTriviaWidth,
    skippedTriviaCodeUnits,
  };
}
