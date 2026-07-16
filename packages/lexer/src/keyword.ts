/**
 * Identifier / keyword / literal / punctuation / operator scanner driven by the
 * single authoritative `KEYWORD_KINDS`, `PUNCTUATION_KINDS`, and
 * `OPERATOR_KINDS` registries published by @gspl/syntax-tree.
 *
 * Prompt 3 §3 / §6 / §13 — no prefix matching. Only the entire lexeme is
 * recognised as a reserved word or literal. These functions are pure, free of
 * global state, and reentrant.
 */
import {
  SyntaxKind,
  KEYWORD_KINDS,
  PUNCTUATION_KINDS,
  OPERATOR_KINDS,
} from '@gspl/syntax-tree';

export interface IdentifierScanResult {
  readonly kind: SyntaxKind;
  readonly lexeme: string;
  readonly width: number;
  /**
   * True iff the scanned lexeme is recognised as a keyword or literal in
   * `KEYWORD_KINDS` / `LITERAL_KINDS`. False means it is an identifier.
   */
  readonly isKeyword: boolean;
}

/** ASCII-only fast path: bypass Unicode classification for lexemes of ASCII letters, digits, underscores. */
function isAsciiIdentCont(ch: number): boolean {
  if (ch === 0x5F) return true;
  if (ch >= 0x41 && ch <= 0x5A) return true;
  if (ch >= 0x61 && ch <= 0x7A) return true;
  if (ch >= 0x30 && ch <= 0x39) return true;
  return false;
}

/** Broad identifier-continue predicate covering Latin extended only; CJK/Greek/Cyrillic use text-source. */
function isDefaultIdentCont(ch: number): boolean {
  if (isAsciiIdentCont(ch)) return true;
  // Latin extended
  if (ch >= 0x00C0 && ch <= 0x024F) return true;
  // Combining marks subset
  if (ch >= 0x0300 && ch <= 0x036F) return true;
  return false;
}

export function scanIdentifierOrKeyword(
  text: string,
  start: number,
  maxLen: number,
): IdentifierScanResult {
  const length = text.length;
  let fast = true;
  let i = start + 1;
  // ASCII fast path: stop at first non-ASCII identifier-continue.
  while (i < length && i - start < maxLen) {
    const ch = text.charCodeAt(i);
    if (ch < 0x80) {
      if (!isAsciiIdentCont(ch)) break;
      i++;
      continue;
    }
    // First non-ASCII character — switch to broad predicate.
    fast = false;
    if (!isDefaultIdentCont(ch)) break;
    if (ch >= 0xD800 && ch <= 0xDBFF) {
      // surrogate pair: step two
      if (i + 1 < length && text.charCodeAt(i + 1) >= 0xDC00 && text.charCodeAt(i + 1) <= 0xDFFF) {
        i += 2;
        continue;
      }
      // unpaired high surrogate: stop
      break;
    }
    i++;
  }
  void fast;
  const lexeme = text.slice(start, i);
  const width = i - start;
  // Exact (whole-lexeme) lookup — never match prefixes or substrings.
  const keywordKind = KEYWORD_KINDS.get(lexeme);
  if (keywordKind !== undefined) {
    return { kind: keywordKind, lexeme, width, isKeyword: true };
  }
  return { kind: SyntaxKind.Identifier, lexeme, width, isKeyword: false };
}

export interface PunctOpResult {
  readonly kind: SyntaxKind;
  readonly width: number;
}

/**
 * Operates against the authoritative @gspl/syntax-tree PUNCTUATION_KINDS and
 * OPERATOR_KINDS maps. Always picks the longest matching prefix (Prompt 3 §13).
 */
export function scanPunctuationOrOperator(text: string, start: number): PunctOpResult {
  const two = text.slice(start, start + 2);
  if (two.length === 2) {
    const op2 = OPERATOR_KINDS.get(two);
    if (op2 !== undefined) return { kind: op2, width: 2 };
    const pu2 = PUNCTUATION_KINDS.get(two);
    if (pu2 !== undefined) return { kind: pu2, width: 2 };
  }
  const one = text[start];
  if (one !== undefined) {
    const op1 = OPERATOR_KINDS.get(one);
    if (op1 !== undefined) return { kind: op1, width: 1 };
    const pu1 = PUNCTUATION_KINDS.get(one);
    if (pu1 !== undefined) return { kind: pu1, width: 1 };
  }
  return { kind: SyntaxKind.Invalid, width: 1 };
}

/**
 * Lookup helper kept for backward compatibility with downstream callers.
 * Returns the SyntaxKind for a stored kind name such as "KeywordSeed" or
 * "Range", or `SyntaxKind.Invalid` if unknown. (Used in non-hot paths.)
 *
 * Note: SyntaxKind is a const enum; circumventing the const-enum string
 * restriction by enumerating known names against the published syntax-tree
 * registries. This avoids forcing every caller to maintain string->kind
 * maps of their own.
 */
import {
  KEYWORD_KINDS as _KEYWORD_KINDS,
  PUNCTUATION_KINDS as _PUNCT_KINDS,
  OPERATOR_KINDS as _OP_KINDS,
} from '@gspl/syntax-tree';

const NAME_LOOKUP: ReadonlyMap<string, SyntaxKind> = (() => {
  const m = new Map<string, SyntaxKind>();
  for (const [k, v] of _KEYWORD_KINDS) m.set(k, v);
  for (const [k, v] of _PUNCT_KINDS) m.set(k, v);
  for (const [k, v] of _OP_KINDS) m.set(k, v);
  return m;
})();

export function resolveKind(name: string): SyntaxKind {
  return NAME_LOOKUP.get(name) ?? SyntaxKind.Invalid;
}
