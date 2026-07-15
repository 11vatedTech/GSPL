/**
 * Main lexer. Prompt 3 Section 12, 13, 20, 21.
 * Hand-written state machine with trivia attachment, guaranteed progress,
 * bounded by SourceLimits.
 */
import type { SourceDocument, SourceLimits, Diagnostic, SourceSpan } from '../../text-source/src/index.js';
import { DEFAULT_SOURCE_LIMITS, makeDiagnostic } from '../../text-source/src/index.js';
import { SyntaxKind, GreenToken, GreenTrivia, isKeyword, isTrivia } from '../../syntax-tree/src/index.js';
import type { GreenTrivia as GTT } from '../../syntax-tree/src/index.js';
import type { Token, LexResult, LexerStatistics, SemanticValue } from './token.js';
import { scanNumericLiteral } from './lex-numeric.js';
import { scanStringLiteral } from './lex-string.js';
import { scanLineComment, scanBlockComment, scanWhitespace } from './lex-comment.js';
import { scanIdentifierOrKeyword, scanPunctuationOrOperator } from './keyword.js';

export interface LexerOptions {
  readonly limits?: SourceLimits;
  readonly languageVersion?: string;
  readonly nestedBlockComments?: boolean;
}

export function lexSource(source: SourceDocument, options: LexerOptions = {}): LexResult {
  const limits = options.limits ?? DEFAULT_SOURCE_LIMITS;
  const nested = options.nestedBlockComments ?? true;
  const maxNesting = 64;
  const text = source.text;
  const length = text.length;
  const tokens: Token[] = [];
  const diagnostics: Diagnostic[] = [];
  let offset = 0;
  let pendingLeading: GTT[] = [];

  const startT = (typeof performance !== 'undefined' ? performance.now() : Date.now());

  if (source.hadBom) {
    pendingLeading.push(GreenTrivia.fromText(SyntaxKind.ByteOrderMarkTrivia, String.fromCharCode(0xFEFF)));
  }

  while (offset < length) {
    const startOffset = offset;
    if (tokens.length >= limits.maxTokenCount) {
      diagnostics.push(makeDiag('GSPL-LEX-TOKEN-LIMIT', 'maxTokenCount exceeded', source, offset, offset));
      break;
    }
    if (diagnostics.length >= limits.maxDiagnostics) break;
    const cp = text.charCodeAt(offset);
    if (cp === 0x20 || cp === 0x09) {
      const { trivia, nextOffset } = scanWhitespace(text, offset, false);
      pendingLeading.push(...trivia);
      offset = nextOffset;
      if (offset === startOffset) offset++;
      continue;
    }
    if (cp === 0x0A || cp === 0x0D) {
      const { trivia, nextOffset } = scanWhitespace(text, offset, true);
      pendingLeading.push(...trivia);
      offset = nextOffset;
      if (offset === startOffset) offset++;
      continue;
    }
    if (cp === 0x2F && text.charCodeAt(offset + 1) === 0x2F) {
      const { trivia, nextOffset } = scanLineComment(text, offset);
      pendingLeading.push(...trivia);
      offset = nextOffset;
      if (offset === startOffset) offset++;
      continue;
    }
    if (cp === 0x2F && text.charCodeAt(offset + 1) === 0x2A) {
      const { trivia, nextOffset } = scanBlockComment(text, offset, nested, maxNesting);
      pendingLeading.push(...trivia);
      offset = nextOffset;
      if (offset === startOffset) offset++;
      continue;
    }
    if (cp >= 0x30 && cp <= 0x39) {
      const result = scanNumericLiteral(text, offset);
      const lexeme = text.slice(offset, offset + result.width);
      const span: SourceSpan = source.span(startOffset, startOffset + result.width);
      tokens.push({
        greenToken: GreenToken.fromText(result.kind, lexeme),
        leadingTrivia: pendingLeading,
        trailingTrivia: [],
        span,
        semanticValue: result.semanticValue as SemanticValue | undefined,
      });
      pendingLeading = [];
      offset = startOffset + result.width;
      if (result.width <= 0) offset = startOffset + 1;
      continue;
    }
    if (cp === 0x22 || (cp === 0x72 && text.charCodeAt(offset + 1) === 0x22)) {
      const result = scanStringLiteral(text, offset);
      const lexeme = text.slice(offset, offset + result.width);
      const span: SourceSpan = source.span(startOffset, startOffset + result.width);
      tokens.push({
        greenToken: GreenToken.fromText(result.kind, lexeme),
        leadingTrivia: pendingLeading,
        trailingTrivia: [],
        span,
        semanticValue: result.semanticValue as SemanticValue | undefined,
      });
      pendingLeading = [];
      offset = startOffset + result.width;
      if (result.width <= 0) offset = startOffset + 1;
      continue;
    }
    if (cp === 0x74 && text.startsWith('true', offset)) {
      const span: SourceSpan = source.span(startOffset, startOffset + 4);
      tokens.push({ greenToken: GreenToken.fromText(SyntaxKind.BooleanLiteral, 'true'), leadingTrivia: pendingLeading, trailingTrivia: [], span, semanticValue: true });
      pendingLeading = [];
      offset = startOffset + 4;
      continue;
    }
    if (cp === 0x66 && text.startsWith('false', offset)) {
      const span: SourceSpan = source.span(startOffset, startOffset + 5);
      tokens.push({ greenToken: GreenToken.fromText(SyntaxKind.BooleanLiteral, 'false'), leadingTrivia: pendingLeading, trailingTrivia: [], span, semanticValue: false });
      pendingLeading = [];
      offset = startOffset + 5;
      continue;
    }
    if (cp === 0x6E && text.startsWith('none', offset)) {
      const span: SourceSpan = source.span(startOffset, startOffset + 4);
      tokens.push({ greenToken: GreenToken.fromText(SyntaxKind.AbsenceLiteral, 'none'), leadingTrivia: pendingLeading, trailingTrivia: [], span, semanticValue: null });
      pendingLeading = [];
      offset = startOffset + 4;
      continue;
    }
    if (isIdentStartCharCode(cp)) {
      const result = scanIdentifierOrKeyword(text, offset, limits.maxIdentifierCodeUnits);
      const lexeme = text.slice(offset, offset + result.width);
      const span: SourceSpan = source.span(startOffset, startOffset + result.width);
      tokens.push({ greenToken: GreenToken.fromText(result.kind, lexeme), leadingTrivia: pendingLeading, trailingTrivia: [], span });
      pendingLeading = [];
      offset = startOffset + result.width;
      if (result.width <= 0) offset = startOffset + 1;
      continue;
    }
    if (isPunctOrOpStart(cp)) {
      const result = scanPunctuationOrOperator(text, offset);
      const lexeme = text.slice(offset, offset + result.width);
      const span: SourceSpan = source.span(startOffset, startOffset + result.width);
      tokens.push({ greenToken: GreenToken.fromText(result.kind, lexeme), leadingTrivia: pendingLeading, trailingTrivia: [], span });
      pendingLeading = [];
      offset = startOffset + result.width;
      if (result.width <= 0) offset = startOffset + 1;
      continue;
    }
    const span: SourceSpan = source.span(startOffset, startOffset + 1);
    diagnostics.push(makeDiag('GSPL-LEX-INVALID-CHARACTER', 'unrecognized character', source, startOffset, startOffset + 1));
    tokens.push({ greenToken: GreenToken.fromText(SyntaxKind.Invalid, text[offset]!), leadingTrivia: pendingLeading, trailingTrivia: [], span });
    pendingLeading = [];
    offset = startOffset + 1;
  }
  tokens.push({ greenToken: GreenToken.fromText(SyntaxKind.EndOfFile, ''), leadingTrivia: pendingLeading, trailingTrivia: [], span: source.span(offset, offset) });
  const elapsed = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startT;
  return {
    source,
    tokens,
    diagnostics,
    statistics: computeStats(tokens, diagnostics, source.lineCount, elapsed),
    complete: offset >= length,
  };
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

function makeDiag(code: string, message: string, source: SourceDocument, start: number, end: number): Diagnostic {
  return makeDiagnostic({ code, message, severity: 'error', span: { sourceId: source.id, start, end }, category: 'lex', phase: 'lex', canonical: true });
}

function computeStats(tokens: readonly Token[], diagnostics: readonly Diagnostic[], lineCount: number, elapsedMs: number): LexerStatistics {
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
    tokenCount: tokens.length,
    triviaCount,
    diagnosticCount: diagnostics.length,
    identifierCount: identCount,
    literalCount,
    keywordCount,
    operatorCount: opCount,
    punctuationCount: punctCount,
    commentCount,
    invalidCount,
    lineCount,
    maxTokenLength,
    totalTokenWidth,
    totalTriviaWidth,
    elapsedMs,
  };
}
