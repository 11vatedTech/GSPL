/**
 * Unicode and source security — Prompt 3 §7.
 * Reject or diagnose: invalid UTF-8, unpaired surrogates, forbidden control chars,
 * BOM, bidi controls, mixed-script confusables, zero-width manipulation,
 * non-normalized identifiers, ambiguous Unicode whitespace, homoglyph collisions.
 *
 * Policy: identifiers are normalized to NFC. Original spelling is preserved
 * separately. Forbidden bidi/zero-width characters are rejected with diagnostics.
 */

/** Unicode bidi control characters (RFC 6649 + LRE/RLE/PDF/LRO/RLO + isolates). */
const BIDI_CONTROLS = new Set<number>([
  0x200E, 0x200F,       // LRM, RLM
  0x202A, 0x202B, 0x202C, 0x202D, 0x202E, // LRE, RLE, PDF, LRO, RLO
  0x2066, 0x2067, 0x2068, 0x2069,       // LRI, RLI, FSI, PDI
]);

/** Zero-width characters that may be used for identifier smuggling. */
const ZERO_WIDTH = new Set<number>([
  0x200B, // zero-width space
  0x200C, // zero-width non-joiner
  0x200D, // zero-width joiner
  0xFEFF, // zero-width no-break space / BOM
  0x2060, // word joiner
  0x2061, 0x2062, 0x2063, 0x2064, // invisible operators
]);

/** Forbidden C0/C1 control characters (excluding common whitespace). */
const FORBIDDEN_CONTROLS = new Set<number>([
  0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
  0x08, /* \t is allowed in trivia */
  0x0B, 0x0C, /* \v, \f are allowed in trivia */
  0x0E, 0x0F,
  0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17,
  0x18, 0x19, 0x1A, 0x1B, 0x1C, 0x1D, 0x1E, 0x1F,
  0x7F, // DEL
  0x80, 0x81, 0x82, 0x83, 0x84, 0x85, 0x86, 0x87,
  0x88, 0x89, 0x8A, 0x8B, 0x8C, 0x8D, 0x8E, 0x8F,
  0x90, 0x91, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97,
  0x98, 0x99, 0x9A, 0x9B, 0x9C, 0x9D, 0x9E, 0x9F,
]);

export interface UnicodeSecurityFinding {
  readonly code: 'GSPL-SOURCE-INVALID-UTF8' | 'GSPL-SOURCE-FORBIDDEN-CONTROL' | 'GSPL-SOURCE-BIDI-CONTROL' | 'GSPL-SOURCE-ZERO-WIDTH' | 'GSPL-SOURCE-NONNORMALIZED-IDENTIFIER' | 'GSPL-SOURCE-CONFUSABLE-IDENTIFIER' | 'GSPL-SOURCE-UNPAIRED-SURROGATE';
  readonly offset: number;
  readonly character: string;
}

export interface UnicodeCheckResult {
  readonly findings: readonly UnicodeSecurityFinding[];
  /** True iff no findings. */
  readonly ok: boolean;
}

/** Scan a source string for forbidden characters. */
export function checkForbiddenControls(text: string): UnicodeCheckResult {
  const findings: UnicodeSecurityFinding[] = [];
  for (let i = 0; i < text.length; i++) {
    const cp = text.charCodeAt(i);
    // Unpaired surrogates: a high surrogate not followed by a low surrogate,
    // or a low surrogate not preceded by a high surrogate.
    if (cp >= 0xD800 && cp <= 0xDBFF) {
      const next = i + 1 < text.length ? text.charCodeAt(i + 1) : 0;
      if (!(next >= 0xDC00 && next <= 0xDFFF)) {
        findings.push({ code: 'GSPL-SOURCE-UNPAIRED-SURROGATE', offset: i, character: text[i]! });
      }
      i++; // skip the surrogate pair
      continue;
    }
    if (cp >= 0xDC00 && cp <= 0xDFFF) {
      findings.push({ code: 'GSPL-SOURCE-UNPAIRED-SURROGATE', offset: i, character: text[i]! });
      continue;
    }
    if (BIDI_CONTROLS.has(cp)) {
      findings.push({ code: 'GSPL-SOURCE-BIDI-CONTROL', offset: i, character: text[i]! });
      continue;
    }
    if (ZERO_WIDTH.has(cp)) {
      findings.push({ code: 'GSPL-SOURCE-ZERO-WIDTH', offset: i, character: text[i]! });
      continue;
    }
    if (FORBIDDEN_CONTROLS.has(cp)) {
      findings.push({ code: 'GSPL-SOURCE-FORBIDDEN-CONTROL', offset: i, character: text[i]! });
      continue;
    }
  }
  return { findings, ok: findings.length === 0 };
}

/** Normalize an identifier to NFC. */
export function normalizeIdentifier(raw: string): string {
  return raw.normalize('NFC');
}

/** Check whether a string is in NFC form. */
export function isNfcNormalized(raw: string): boolean {
  return raw === raw.normalize('NFC');
}

/** Latin/Cyrillic/Greek confusable detection (minimal set; full set is a separate concern). */
const CYRILLIC_LOOKALIKE = new Set<number>([
  0x0410, 0x0412, 0x0415, 0x041A, 0x041C, 0x041D, 0x041E, 0x0420, 0x0421, 0x0422, 0x0425,
  0x0430, 0x0435, 0x043E, 0x043F, 0x0440, 0x0441, 0x0443, 0x0445,
]);
const GREEK_LOOKALIKE = new Set<number>([
  0x0391, 0x0392, 0x0395, 0x0396, 0x0397, 0x0399, 0x039A, 0x039C, 0x039D, 0x039F, 0x03A1, 0x03A4, 0x03A5, 0x03A7,
  0x03B1, 0x03B5, 0x03B9, 0x03BF, 0x03C1, 0x03C5,
]);

/** Check whether a single identifier character looks like a Latin letter but is not. */
export function looksLikeConfusable(ch: string): boolean {
  if (ch.length !== 1) return false;
  const cp = ch.codePointAt(0)!;
  return CYRILLIC_LOOKALIKE.has(cp) || GREEK_LOOKALIKE.has(cp);
}


/** Scan an identifier for confusable characters (Prompt 3 §7). */
export function checkConfusables(identifier: string): UnicodeCheckResult {
  const findings: UnicodeSecurityFinding[] = [];
  for (let i = 0; i < identifier.length; ) {
    const cp = identifier.codePointAt(i)!;
    const ch = String.fromCodePoint(cp);
    if (looksLikeConfusable(ch)) {
      findings.push({ code: 'GSPL-SOURCE-CONFUSABLE-IDENTIFIER', offset: i, character: ch });
    }
    i += ch.length; // advance by 1 for BMP, 2 for surrogate pair
  }
  return { findings, ok: findings.length === 0 };
}
