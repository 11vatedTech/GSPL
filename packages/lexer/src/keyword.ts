/**
 * Keyword/operator/punctuation lookup. Prompt 3 §13.
 */
import { SyntaxKind, KEYWORD_KINDS, PUNCTUATION_KINDS, OPERATOR_KINDS } from '../../syntax-tree/src/index.js';

export interface KeywordResult {
  readonly kind: SyntaxKind;
  readonly width: number;
  readonly isKeyword: boolean;
}

export function scanIdentifierOrKeyword(text: string, start: number, maxLen: number): KeywordResult {
  let i = start + 1;
  while (i < text.length && i - start < maxLen) {
    const ch = text.charCodeAt(i);
    if (!isIdentContinueCharCode(ch)) break;
    i++;
  }
  const lexeme = text.slice(start, i);
  const kw = KEYWORD_KINDS.get(lexeme);
  if (kw !== undefined) return { kind: kw, width: i - start, isKeyword: true };
  return { kind: SyntaxKind.Identifier, width: i - start, isKeyword: false };
}

function isIdentContinueCharCode(ch: number): boolean {
  if (ch === 0x5F) return true;
  if ((ch >= 0x41 && ch <= 0x5A) || (ch >= 0x61 && ch <= 0x7A)) return true;
  if (ch >= 0x30 && ch <= 0x39) return true;
  if (ch >= 0x00C0 && ch <= 0x024F) return true;
  if (ch >= 0x0300 && ch <= 0x036F) return true;
  return false;
}

export function scanPunctuationOrOperator(text: string, start: number): KeywordResult {
  const two = text.slice(start, start + 2);
  const one = text[start]!;
  // Only match the two-character form when two is actually 2 chars long.
  // When start is at the end of text, text.slice(start, start+2) returns a
  // 1-char string that may still match a single-char PUNCTUATION key — which
  // would incorrectly return width=2.
  if (two.length === 2 && OPERATOR_KINDS.has(two)) return { kind: OPERATOR_KINDS.get(two)!, width: 2, isKeyword: false };
  if (two.length === 2 && PUNCTUATION_KINDS.has(two)) return { kind: PUNCTUATION_KINDS.get(two)!, width: 2, isKeyword: false };
  if (OPERATOR_KINDS.has(one)) return { kind: OPERATOR_KINDS.get(one)!, width: 1, isKeyword: false };
  if (PUNCTUATION_KINDS.has(one)) return { kind: PUNCTUATION_KINDS.get(one)!, width: 1, isKeyword: false };
  return { kind: SyntaxKind.Invalid, width: 1, isKeyword: false };
}
