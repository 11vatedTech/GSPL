/**
 * Comment and trivia scanner with nesting / size diagnostic emission.
 * Prompt 3 Final Lexer Closure §2 — exposes TriviaScanMetadata so the
 * main lexer can decide ownership based on whether the trivia's lexeme
 * itself contains a supported line terminator (LF/CRLF/CR/U+2028/U+2029).
 *
 * Whitespace classification:
 *  - spaces/tabs alone => WhitespaceTrivia
 *  - newline sequences  => NewlineTrivia (LF, CRLF, CR, U+2028, U+2029)
 *
 * Comment classification:
 *  - line comment     => LineCommentTrivia
 *  - block comment    => BlockCommentTrivia
 *  - documentation(/** *) => DocumentationCommentTrivia (outermost determines kind)
 *
 * Maximum nesting depth and maximum comment length come from SourceLimits so
 * that they are tunable without touching lexer source.
 */
import { SyntaxKind, GreenTrivia } from '@gspl/syntax-tree';
import { makeDiagnostic } from '@gspl/text-source';
import type { SourceId, SourceLimits } from '@gspl/text-source';

/**
 * Marker whether the trivia's OWN lexeme crosses a line terminator. This is
 * what lets the main lexer correctly route multiline block comments to
 * leading trivia of the following token (rather than trailing trivia of the
 * preceding token) — see Prompt 3 Final Closure §2.
 */
export interface TriviaScanMetadata {
  readonly containsLineTerminator: boolean;
  readonly lineTerminatorCount: number;
  readonly firstLineTerminatorOffset?: number;
  readonly terminated: boolean;
}

export interface TriviaScanResult extends TriviaScanMetadata {
  readonly trivia: readonly GreenTrivia[];
  readonly nextOffset: number;
  readonly diagnostics: readonly ReturnType<typeof makeDiagnostic>[];
  readonly limitExceeded: boolean;
}

export interface CommentScannerOptions {
  readonly sourceId: SourceId;
  readonly limits: SourceLimits;
  readonly allowNestedBlockComments: boolean;
  readonly maxCommentNestingDepth: number;
}

const CR = 0x0D;
const LF = 0x0A;
const SP = 0x20;
const TAB = 0x09;
const U2028 = 0x2028;
const U2029 = 0x2029;

function countLineTerminators(text: string): { contains: boolean; count: number; firstOffset?: number } {
  let count = 0;
  let firstOffset: number | undefined;
  for (let i = 0; i < text.length; ) {
    const ch = text.charCodeAt(i);
    if (ch === LF) { if (firstOffset === undefined) firstOffset = i; count++; i++; continue; }
    if (ch === CR) {
      if (firstOffset === undefined) firstOffset = i;
      count++;
      i += (i + 1 < text.length && text.charCodeAt(i + 1) === LF) ? 2 : 1;
      continue;
    }
    if (ch === U2028 || ch === U2029) { if (firstOffset === undefined) firstOffset = i; count++; i++; continue; }
    i += (ch >= 0xD800 && ch <= 0xDBFF) ? 2 : 1;
  }
  return { contains: count > 0, count, firstOffset };
}

export function scanLineComment(text: string, start: number, opts: { sourceId: SourceId; maxCommentCodeUnits: number }): TriviaScanResult {
  let i = start + 2;
  const diagnostics: ReturnType<typeof makeDiagnostic>[] = [];
  while (i < text.length) {
    const ch = text.charCodeAt(i);
    if (ch === LF || ch === CR || ch === U2028 || ch === U2029) break;
    i++;
  }
  const body = text.slice(start, i);
  if (body.length > opts.maxCommentCodeUnits) {
    diagnostics.push(makeDiagnostic({ code: 'GSPL-LEX-COMMENT-TOO-LARGE', message: 'line comment exceeds maxCommentCodeUnits: ' + body.length, severity: 'error', span: { sourceId: opts.sourceId, start, end: i }, category: 'lex', phase: 'lex', canonical: true }));
  }
  const meta = countLineTerminators(body);
  return {
    trivia: [GreenTrivia.fromText(SyntaxKind.LineCommentTrivia, body)],
    nextOffset: i,
    diagnostics,
    limitExceeded: body.length > opts.maxCommentCodeUnits,
    containsLineTerminator: meta.contains,
    lineTerminatorCount: meta.count,
    firstLineTerminatorOffset: meta.firstOffset,
    terminated: true,
  };
}

export function scanBlockComment(text: string, start: number, opts: CommentScannerOptions): TriviaScanResult {
  const isDoc = text.charCodeAt(start + 2) === 0x2A && text.charCodeAt(start + 3) === 0x2A;
  let i = start + 2 + (isDoc ? 1 : 0);
  let depth = 1;
  const diagnostics: ReturnType<typeof makeDiagnostic>[] = [];
  while (i < text.length) {
    const ch = text.charCodeAt(i);
    if (ch === 0x2F && text.charCodeAt(i + 1) === 0x2A) {
      if (opts.allowNestedBlockComments) {
        depth++;
        if (depth > opts.maxCommentNestingDepth) {
          diagnostics.push(makeDiagnostic({ code: 'GSPL-LEX-COMMENT-NESTING-LIMIT', message: 'block comment depth ' + depth + ' exceeds max ' + opts.maxCommentNestingDepth, severity: 'error', span: { sourceId: opts.sourceId, start, end: i + 2 }, category: 'lex', phase: 'lex', canonical: true }));
        }
        i += 2;
        continue;
      } else {
        diagnostics.push(makeDiagnostic({ code: 'GSPL-LEX-COMMENT-NESTING-DISABLED', message: 'nested block comment found but nesting disabled', severity: 'error', span: { sourceId: opts.sourceId, start, end: i }, category: 'lex', phase: 'lex', canonical: true }));
        const body = text.slice(start, i);
        const meta = countLineTerminators(body);
        return { trivia: [GreenTrivia.fromText(isDoc ? SyntaxKind.DocumentationCommentTrivia : SyntaxKind.BlockCommentTrivia, body)], nextOffset: i, diagnostics, limitExceeded: depth > opts.maxCommentNestingDepth, containsLineTerminator: meta.contains, lineTerminatorCount: meta.count, firstLineTerminatorOffset: meta.firstOffset, terminated: false };
      }
    }
    if (ch === 0x2A && text.charCodeAt(i + 1) === 0x2F) {
      depth--;
      if (depth === 0) {
        i += 2;
        const body = text.slice(start, i);
        if (body.length > opts.limits.maxCommentCodeUnits) {
          diagnostics.push(makeDiagnostic({ code: 'GSPL-LEX-COMMENT-TOO-LARGE', message: 'block comment exceeds maxCommentCodeUnits: ' + body.length, severity: 'error', span: { sourceId: opts.sourceId, start, end: i }, category: 'lex', phase: 'lex', canonical: true }));
        }
        const meta = countLineTerminators(body);
        return {
          trivia: [GreenTrivia.fromText(isDoc ? SyntaxKind.DocumentationCommentTrivia : SyntaxKind.BlockCommentTrivia, body)],
          nextOffset: i,
          diagnostics,
          limitExceeded: body.length > opts.limits.maxCommentCodeUnits,
          containsLineTerminator: meta.contains,
          lineTerminatorCount: meta.count,
          firstLineTerminatorOffset: meta.firstOffset,
          terminated: true,
        };
      }
      i += 2;
      continue;
    }
    i++;
  }
  diagnostics.push(makeDiagnostic({ code: 'GSPL-LEX-UNTERMINATED-BLOCK-COMMENT', message: 'block comment is not terminated before EOF', severity: 'error', span: { sourceId: opts.sourceId, start, end: text.length }, category: 'lex', phase: 'lex', canonical: true }));
  const body = text.slice(start, text.length);
  const meta = countLineTerminators(body);
  return {
    trivia: [GreenTrivia.fromText(isDoc ? SyntaxKind.DocumentationCommentTrivia : SyntaxKind.BlockCommentTrivia, body)],
    nextOffset: text.length,
    diagnostics,
    limitExceeded: true,
    containsLineTerminator: meta.contains,
    lineTerminatorCount: meta.count,
    firstLineTerminatorOffset: meta.firstOffset,
    terminated: false,
  };
}

export function scanWhitespace(text: string, start: number, includeNewline: boolean): TriviaScanResult {
  let i = start;
  const trivia: GreenTrivia[] = [];
  let chunkStart = i;
  let chunkKind: SyntaxKind | undefined;
  function flush() {
    if (chunkKind !== undefined && i > chunkStart) {
      trivia.push(GreenTrivia.fromText(chunkKind, text.slice(chunkStart, i)));
    }
    chunkStart = i;
    chunkKind = undefined;
  }
  while (i < text.length) {
    const ch = text.charCodeAt(i);
    if (ch === LF) {
      if (!includeNewline) break;
      flush();
      trivia.push(GreenTrivia.fromText(SyntaxKind.NewlineTrivia, String.fromCharCode(LF)));
      i++;
      chunkStart = i;
      continue;
    }
    if (ch === CR) {
      if (!includeNewline) break;
      flush();
      const isCrlf = i + 1 < text.length && text.charCodeAt(i + 1) === LF;
      trivia.push(GreenTrivia.fromText(SyntaxKind.NewlineTrivia, isCrlf ? String.fromCharCode(CR) + String.fromCharCode(LF) : String.fromCharCode(CR)));
      i += isCrlf ? 2 : 1;
      chunkStart = i;
      continue;
    }
    if (ch === U2028 || ch === U2029) {
      if (!includeNewline) break;
      flush();
      trivia.push(GreenTrivia.fromText(SyntaxKind.NewlineTrivia, String.fromCharCode(ch)));
      i++;
      chunkStart = i;
      continue;
    }
    if (ch === SP || ch === TAB || ch === 0x0B || ch === 0x0C) {
      if (chunkKind !== SyntaxKind.WhitespaceTrivia) {
        flush();
        chunkKind = SyntaxKind.WhitespaceTrivia;
      }
      i++;
      continue;
    }
    break;
  }
  flush();
  // Whitespace scans of `includeNewline=true` always contain at least one
  // newline form whenever any newline was emitted; whitespace-only scans
  // never contain a line terminator because they only consume SP/TAB/VT/FF.
  const containsLineTerminator = includeNewline && trivia.some((t) => t.kind === SyntaxKind.NewlineTrivia);
  const lineCount = trivia.reduce((n, t) => n + (t.kind === SyntaxKind.NewlineTrivia ? 1 : 0), 0);
  return {
    trivia,
    nextOffset: i,
    diagnostics: [],
    limitExceeded: false,
    containsLineTerminator,
    lineTerminatorCount: lineCount,
    terminated: i >= text.length,
  };
}
