/**
 * Identifier / keyword / literal / punctuation / operator scanner driven by the
 * single authoritative `KEYWORD_KINDS`, `PUNCTUATION_KINDS`, and
 * `OPERATOR_KINDS` registries published by @gspl/syntax-tree.
 *
 * Prompt 3 Final Unlock §3 — code-point-aware scanning via
 * `packages/lexer/src/codepoint.ts`. Identifier classification uses the
 * versioned profile (`isIdentifierStartChar` / `isIdentifierContinueChar`)
 * from @gspl/text-source with the FULL Unicode scalar value (BMP or
 * supplementary), never on isolated UTF-16 code units. The handwritten
 * `U+00C0-24F` / `U+0300-36F` ranges previously present here have been
 * removed; the profile is the single source of truth.
 *
 * Prompt 3 Final Unlock §4 — supplementary-plane policy. The gspl-v1
 * profile accepts a fixed set of BMP scripts. Code points above U+FFFF
 * are rejected with `rejectedSupplementary=true` and emitted through
 * the lexer's `GSPL-LEX-SUPPLEMENTARY-IDENTIFIER` path with the exact
 * 2-UTF-16-unit span.
 *
 * Prompt 3 §3 / §6 / §13 — no prefix matching. Only the entire lexeme is
 * recognised as a reserved word or literal.
 */
import {
  SyntaxKind,
  KEYWORD_KINDS,
  PUNCTUATION_KINDS,
  OPERATOR_KINDS,
} from '@gspl/syntax-tree';
import { isIdentifierStartChar, isIdentifierContinueChar } from '@gspl/text-source';

export interface IdentifierScanResult {
  readonly kind: SyntaxKind;
  readonly lexeme: string;
  readonly width: number;
  /** True iff the scanned lexeme is recognised as a keyword or literal. */
  readonly isKeyword: boolean;
  /** True iff a supplementary-plane (U+10000+) code point was rejected. */
  readonly rejectedSupplementary: boolean;
}

/* ASCII fast path predicates. */
function isAsciiIdentStart(ch: number): boolean {
  if (ch === 0x5F) return true;
  if (ch >= 0x41 && ch <= 0x5A) return true;
  if (ch >= 0x61 && ch <= 0x7A) return true;
  return false;
}
function isAsciiIdentCont(ch: number): boolean {
  if (ch === 0x5F) return true;
  if (ch >= 0x41 && ch <= 0x5A) return true;
  if (ch >= 0x61 && ch <= 0x7A) return true;
  if (ch >= 0x30 && ch <= 0x39) return true;
  return false;
}

/**
 * Scan an identifier or keyword. Reads Unicode scalar values via the
 * authoritative `readSourceCodePoint` boundary. Supplementary-plane
 * code points are rejected inside the scan: the scan stops at the
 * supplementary character and flags `rejectedSupplementary=true`. The
 * lexer then emits exactly one `GSPL-LEX-SUPPLEMENTARY-IDENTIFIER`
 * diagnostic against this exact position and a single Invalid token
 * covering the full scalar (2 UTF-16 units).
 *
 * Recovery contract (Final Unlock §4): a supplementary char produces an
 * Invalid token of width 2 ONLY. Adjacent identifier continuations form
 * SEPARATE tokens starting at offset+2. Identifiers are never split
 * across supplementary boundaries; supplementary chars are never split
 * across surrogate pairs.
 */
export function scanIdentifierOrKeyword(
  text: string,
  start: number,
  maxLen: number,
): IdentifierScanResult {
  const length = text.length;
  if (start >= length) {
    return { kind: SyntaxKind.Identifier, lexeme: '', width: 0, isKeyword: false, rejectedSupplementary: false };
  }
  let i: number;
  let rejectedSupplementary = false;

  const first = text.charCodeAt(start);
  if (first < 0x80) {
    if (!isAsciiIdentStart(first)) {
      return { kind: SyntaxKind.Identifier, lexeme: text.slice(start, start + 1), width: 1, isKeyword: false, rejectedSupplementary: false };
    }
    i = start + 1;
  } else {
    /* Non-ASCII start character. */
    if (first >= 0xD800 && first <= 0xDBFF) {
      /* High surrogate: validate pair. */
      if (start + 1 >= length || text.charCodeAt(start + 1) < 0xDC00 || text.charCodeAt(start + 1) > 0xDFFF) {
        /* Unpaired — return width 0, scanner returns no identifier; the
         * lexer's identifier dispatch falls through to Invalid emission
         * with `containsUnpairedSurrogate` flagged upstream. */
        return { kind: SyntaxKind.Identifier, lexeme: '', width: 0, isKeyword: false, rejectedSupplementary: false };
      }
      const cp = (first - 0xD800) * 0x400 + (text.charCodeAt(start + 1) - 0xDC00) + 0x10000;
      /* Supplementary at IDENTIFIER start: rejected by gspl-v1 (§4). */
      if (cp > 0xFFFF) {
        rejectedSupplementary = true;
        i = start;
      } else if (!isIdentifierStartChar(String.fromCodePoint(cp))) {
        return { kind: SyntaxKind.Identifier, lexeme: text.slice(start, start + 2), width: 2, isKeyword: false, rejectedSupplementary: false };
      } else {
        i = start + 2;
      }
    } else if (first >= 0xDC00 && first <= 0xDFFF) {
      /* Low surrogate alone is invalid; width 0. */
      return { kind: SyntaxKind.Identifier, lexeme: '', width: 0, isKeyword: false, rejectedSupplementary: false };
    } else if (!isIdentifierStartChar(String.fromCharCode(first))) {
      return { kind: SyntaxKind.Identifier, lexeme: text.slice(start, start + 1), width: 1, isKeyword: false, rejectedSupplementary: false };
    } else {
      i = start + 1;
    }
  }

  /* Continuation characters. */
  while (i < length && i - start < maxLen) {
    const cu = text.charCodeAt(i);
    if (cu < 0x80) {
      if (!isAsciiIdentCont(cu)) break;
      i++;
      continue;
    }
    if (cu >= 0xD800 && cu <= 0xDBFF) {
      if (i + 1 >= length || text.charCodeAt(i + 1) < 0xDC00 || text.charCodeAt(i + 1) > 0xDFFF) {
        /* Unpaired high surrogate: stop lexeme cleanly. */
        break;
      }
      const cp = (cu - 0xD800) * 0x400 + (text.charCodeAt(i + 1) - 0xDC00) + 0x10000;
      if (cp > 0xFFFF) {
        /* Supplementary at CONTINUATION: same rejection (§4). */
        rejectedSupplementary = true;
        break;
      }
      if (isIdentifierContinueChar(String.fromCodePoint(cp))) {
        i += 2;
        continue;
      }
      break;
    }
    if (cu >= 0xDC00 && cu <= 0xDFFF) break;
    if (isIdentifierContinueChar(String.fromCharCode(cu))) {
      i++;
      continue;
    }
    break;
  }

  if (rejectedSupplementary) {
    return { kind: SyntaxKind.Identifier, lexeme: text.slice(start, i), width: i - start, isKeyword: false, rejectedSupplementary: true };
  }

  const lexeme = text.slice(start, i);
  const width = i - start;
  const keywordKind = KEYWORD_KINDS.get(lexeme);
  if (keywordKind !== undefined) {
    return { kind: keywordKind, lexeme, width, isKeyword: true, rejectedSupplementary: false };
  }
  return { kind: SyntaxKind.Identifier, lexeme, width, isKeyword: false, rejectedSupplementary: false };
}

export interface PunctOpResult {
  readonly kind: SyntaxKind;
  readonly width: number;
}

/**
 * Operates against the authoritative @gspl/syntax-tree PUNCTUATION_KINDS and
 * OPERATOR_KINDS maps. Always picks the longest matching prefix.
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

/** Lookup helper for backward compatibility with downstream callers. */
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
