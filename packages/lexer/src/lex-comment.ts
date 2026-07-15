/**
 * Comment and trivia scanning. Prompt 3 §15, §14.
 * - // line comment
 * - /* * / block comment (nested if nestedBlockComments=true)
 * - / ** * / documentation comment (outermost /** determines kind)
 * - Whitespace, newlines
 */
import { SyntaxKind, GreenTrivia } from '../../syntax-tree/src/index.js';

export interface TriviaScanResult {
  readonly trivia: readonly GreenTrivia[];
  readonly nextOffset: number;
}

export function scanLineComment(text: string, start: number): TriviaScanResult {
  let i = start + 2;
  while (i < text.length) {
    const ch = text.charCodeAt(i);
    if (ch === 0x0A || ch === 0x0D) break;
    i++;
  }
  return {
    trivia: [GreenTrivia.fromText(SyntaxKind.LineCommentTrivia, text.slice(start, i))],
    nextOffset: i,
  };
}

export function scanBlockComment(
  text: string,
  start: number,
  nested: boolean,
  maxNestingDepth: number,
): TriviaScanResult {
  const isDoc = text.charCodeAt(start + 2) === 0x2A && text.charCodeAt(start + 3) === 0x2A;
  let i = start + 2 + (isDoc ? 1 : 0);
  let depth = 1;
  while (i < text.length) {
    const ch = text.charCodeAt(i);
    if (ch === 0x2F && text.charCodeAt(i + 1) === 0x2A) {
      if (nested) {
        depth++;
        if (depth > maxNestingDepth) {
          return {
            trivia: [GreenTrivia.fromText(isDoc ? SyntaxKind.DocumentationCommentTrivia : SyntaxKind.BlockCommentTrivia, text.slice(start, i + 2))],
            nextOffset: i + 2,
          };
        }
        i += 2;
        continue;
      } else {
        return {
          trivia: [GreenTrivia.fromText(isDoc ? SyntaxKind.DocumentationCommentTrivia : SyntaxKind.BlockCommentTrivia, text.slice(start, i))],
          nextOffset: i,
        };
      }
    }
    if (ch === 0x2A && text.charCodeAt(i + 1) === 0x2F) {
      depth--;
      if (depth === 0) {
        i += 2;
        return {
          trivia: [GreenTrivia.fromText(isDoc ? SyntaxKind.DocumentationCommentTrivia : SyntaxKind.BlockCommentTrivia, text.slice(start, i))],
          nextOffset: i,
        };
      }
      i += 2;
      continue;
    }
    i++;
  }
  return {
    trivia: [GreenTrivia.fromText(isDoc ? SyntaxKind.DocumentationCommentTrivia : SyntaxKind.BlockCommentTrivia, text.slice(start, i))],
    nextOffset: i,
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
    if (ch === 0x0A) {
      if (!includeNewline) break;
      flush();
      trivia.push(GreenTrivia.fromText(SyntaxKind.NewlineTrivia, String.fromCharCode(0x0A)));
      i++;
      chunkStart = i;
      continue;
    }
    if (ch === 0x0D) {
      if (!includeNewline) break;
      flush();
      const isCrlf = i + 1 < text.length && text.charCodeAt(i + 1) === 0x0A;
      trivia.push(GreenTrivia.fromText(SyntaxKind.NewlineTrivia, isCrlf ? String.fromCharCode(0x0D) + String.fromCharCode(0x0A) : String.fromCharCode(0x0D)));
      i += isCrlf ? 2 : 1;
      chunkStart = i;
      continue;
    }
    if (ch === 0x20 || ch === 0x09) {
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
  return { trivia, nextOffset: i };
}
