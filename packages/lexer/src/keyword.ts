/**
 * Identifier / keyword / literal / punctuation / operator scanner driven by the
 * single authoritative `KEYWORD_KINDS`, `PUNCTUATION_KINDS`, and
 * `OPERATOR_KINDS` registries published by @gspl/syntax-tree.
 *
 * Prompt 3 Final Closure §4 — code-point-aware scanning. Identifier
 * classification uses the versioned profile (`isIdentifierStartChar` /
 * `isIdentifierContinueChar`) from @gspl/text-source with the FULL Unicode
 * scalar value (BMP or supplementary), never on isolated UTF-16 code units.
 * The handwritten `U+00C0-24F` / `U+0300-36F` ranges previously present
 * here have been removed; the profile is the single source of truth.
 *
 * Prompt 3 Final Closure §4 — supplementary-plane policy. The gspl-v1
 * profile accepts a fixed set of BMP scripts (Latin ASCII, Latin extended,
 * Greek, Cyrillic via `isIdentifierStartChar`/`isIdentifierContinueChar`).
 * Code points above U+FFFF are rejected as
 * `GSPL-LEX-SUPPLEMENTARY-IDENTIFIER` rather than split across surrogate
 * pairs, by deliberate declared policy (final closure §4).
 *
 * Gap between BMP and supplementary: this is intentional. We do not split
 * surrogate pairs and we do not silently drop supplementary code points.
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

/* ASCII fast path predicates for the first character (start-of-identifier
 * must not be a digit) and continuation characters. Profile-driven
 * `isIdentifierStartChar` / `isIdentifierContinueChar` are used for the
 * non-ASCII branch. */
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
 * Read the Unicode scalar value at `offset` and the UTF-16 width it
 * occupies (1 for BMP, 2 for supplementary-plane). Unpaired surrogates
 * are surfaced separately so the caller can decide.
 */
function readCodePoint(text: string, offset: number): { cp: number | undefined; width: number; unpairedSurrogate: boolean } {
  if (offset >= text.length) return { cp: undefined, width: 0, unpairedSurrogate: false };
  const cu = text.charCodeAt(offset);
  if (cu >= 0xD800 && cu <= 0xDBFF) {
    if (offset + 1 < text.length) {
      const lo = text.charCodeAt(offset + 1);
      if (lo >= 0xDC00 && lo <= 0xDFFF) {
        return { cp: (cu - 0xD800) * 0x400 + (lo - 0xDC00) + 0x10000, width: 2, unpairedSurrogate: false };
      }
    }
    return { cp: cu, width: 1, unpairedSurrogate: true };
  }
  if (cu >= 0xDC00 && cu <= 0xDFFF) {
    return { cp: cu, width: 1, unpairedSurrogate: true };
  }
  return { cp: cu, width: 1, unpairedSurrogate: false };
}

/**
 * Scan an identifier or keyword. The first character is read as either
 * ASCII (fast path) or full code-point (delegated to the profile's
 * `isIdentifierStartChar`). Continuation characters are similarly read
 * code-point by code-point. Supplementary-plane code points are rejected
 * inside the scan: the scan stops at the supplementary character and
 * flags `rejectedSupplementary=true` so the lexer can emit a single
 * structured diagnostic rather than silently splitting the surrogate
 * pair or accepting the disallowed code point.
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

  /* Start character. */
  if (start + 1 > length) return { kind: SyntaxKind.Identifier, lexeme: text.slice(start, start + 1), width: 1, isKeyword: false, rejectedSupplementary: false };
  const firstCu = text.charCodeAt(start);
  if (firstCu < 0x80) {
    if (!isAsciiIdentStart(firstCu)) {
      return { kind: SyntaxKind.Identifier, lexeme: text.slice(start, start + 1), width: 1, isKeyword: false, rejectedSupplementary: false };
    }
    i = start + 1;
  } else {
    const { cp, width, unpairedSurrogate } = readCodePoint(text, start);
    if (cp === undefined) return { kind: SyntaxKind.Identifier, lexeme: '', width: 0, isKeyword: false, rejectedSupplementary: false };
    if (unpairedSurrogate) {
      // Don't form an identifier from an unpaired surrogate at all.
      return { kind: SyntaxKind.Identifier, lexeme: text.slice(start, start + width), width, isKeyword: false, rejectedSupplementary: false };
    }
    if (cp > 0xFFFF) {
      // Supplementary-plane code point rejected by gspl-v1 policy (§4).
      // The issued identifier starts here with zero width; the lexer will
      // observe `rejectedSupplementary=true` and emit the structured
      // diagnostic against this exact position.
      rejectedSupplementary = true;
      i = start;
    } else if (cp <= 0xFFFF && !isIdentifierStartChar(String.fromCodePoint(cp))) {
      return { kind: SyntaxKind.Identifier, lexeme: text.slice(start, start + width), width, isKeyword: false, rejectedSupplementary: false };
    } else {
      i = start + width;
    }
  }

  /* Continuation characters. */
  while (i < length && i - start < maxLen) {
    const widRead = readCodePoint(text, i);
    if (widRead.cp === undefined) break;
    if (widRead.unpairedSurrogate) break;
    if (widRead.cp > 0xFFFF) {
      rejectedSupplementary = true;
      break;
    }
    const cp = widRead.cp;
    const cpStr = String.fromCodePoint(cp);
    if (cp < 0x80) {
      if (!isAsciiIdentCont(cp)) break;
      i += 1;
      continue;
    }
    if (isIdentifierContinueChar(cpStr)) {
      i += widRead.width;
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
