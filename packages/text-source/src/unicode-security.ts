/**
 * Unicode and source security — Prompt 3 §7, §9.
 * Versioned identifier profile with NFC normalization, mixed-script detection,
 * confusable-skeleton generation, default-ignorable rejection, and forbidden
 * control/bidi/zero-width detection.
 */
import type {
  IdentifierIdentity,
  UnicodeCheckResult,
  UnicodeSecurityCode,
  UnicodeSecurityFinding,
} from './types.js';

/** Versioned Unicode data anchor. Programmatic ranges only — no external deps. */
export const UNICODE_PROFILE = {
  unicodeVersion: '15.1.0',
  normalizationForm: 'NFC',
  identifierProfile: 'gspl-v1',
} as const;

const BIDI_CONTROLS = new Set<number>([
  0x200E, 0x200F,
  0x202A, 0x202B, 0x202C, 0x202D, 0x202E,
  0x2066, 0x2067, 0x2068, 0x2069,
]);
const ZERO_WIDTH = new Set<number>([
  0x200B, 0x200C, 0x200D, 0xFEFF, 0x2060, 0x2061, 0x2062, 0x2063, 0x2064,
]);
const FORBIDDEN_CONTROLS = new Set<number>([
  0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
  0x0E, 0x0F,
  0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17,
  0x18, 0x19, 0x1A, 0x1B, 0x1C, 0x1D, 0x1E, 0x1F,
  0x7F,
  0x80, 0x81, 0x82, 0x83, 0x84, 0x85, 0x86, 0x87,
  0x88, 0x89, 0x8A, 0x8B, 0x8C, 0x8D, 0x8E, 0x8F,
  0x90, 0x91, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97,
  0x98, 0x99, 0x9A, 0x9B, 0x9C, 0x9D, 0x9E, 0x9F,
]);
/** Default-ignorable code points (subset per Unicode 15.1 PropList.txt Default_Ignorable_Code_Point). */
const DEFAULT_IGNORABLE = new Set<number>([
  0x00AD, 0x034F, 0x061C, 0x115F, 0x1160, 0x17B4, 0x17B5, 0x180B, 0x180C, 0x180D,
  0x180E, 0x200B, 0x200C, 0x200D, 0x200E, 0x200F, 0x202A, 0x202B, 0x202C, 0x202D, 0x202E,
  0x2060, 0x2061, 0x2062, 0x2063, 0x2064, 0x2065, 0x2066, 0x2067, 0x2068, 0x2069, 0x206A,
  0x206B, 0x206C, 0x206D, 0x206E, 0x206F,
  0xFE00, 0xFE01, 0xFE02, 0xFE03, 0xFE04, 0xFE05, 0xFE06, 0xFE07, 0xFE08, 0xFE09, 0xFE0A,
  0xFE0B, 0xFE0C, 0xFE0D, 0xFE0E, 0xFE0F,
  0xFEFF,
  0xFFF0, 0xFFF1, 0xFFF2, 0xFFF3, 0xFFF4, 0xFFF5, 0xFFF6, 0xFFF7, 0xFFF8,
  0xE0000, 0xE0001, 0xE0002, 0xE0003, 0xE0004, 0xE0005, 0xE0006, 0xE0007, 0xE0008,
  0xE0009, 0xE000A, 0xE000B, 0xE000C, 0xE000D, 0xE000E, 0xE000F, 0xE0010, 0xE0011,
  0xE0012, 0xE0013, 0xE0014, 0xE0015, 0xE0016, 0xE0017, 0xE0018, 0xE0019, 0xE001A,
  0xE001B, 0xE001C, 0xE001D, 0xE001E, 0xE001F,
  0xE0080, 0xE0081, 0xE0082, 0xE0083, 0xE0084, 0xE0085, 0xE0086, 0xE0087,
  0xE0088, 0xE0089, 0xE008A, 0xE008B, 0xE008C, 0xE008D, 0xE008E, 0xE008F,
  0xE0100, 0xE0101, 0xE0102, 0xE0103, 0xE0104, 0xE0105, 0xE0106, 0xE0107,
  0xE0108, 0xE0109, 0xE010A, 0xE010B, 0xE010C, 0xE010D, 0xE010E, 0xE010F,
  0xE01F0, 0xE01F1, 0xE01F2, 0xE01F3, 0xE01F4, 0xE01F5, 0xE01F6, 0xE01F7,
  0xE01F8, 0xE01F9, 0xE01FA, 0xE01FB, 0xE01FC, 0xE01FD, 0xE01FE, 0xE01FF,
]);
/** Cyrillic and Greek confusable lookalikes for Latin ASCII. */
const CYRILLIC_LOOKALIKE = new Set<number>([
  0x0410, 0x0412, 0x0415, 0x041A, 0x041C, 0x041D, 0x041E, 0x0420, 0x0421, 0x0422, 0x0425,
  0x0430, 0x0435, 0x043E, 0x043F, 0x0440, 0x0441, 0x0443, 0x0445,
]);
const GREEK_LOOKALIKE = new Set<number>([
  0x0391, 0x0392, 0x0395, 0x0396, 0x0397, 0x0399, 0x039A, 0x039C, 0x039D, 0x039F, 0x03A1, 0x03A4, 0x03A5, 0x03A7,
  0x03B1, 0x03B5, 0x03B9, 0x03BF, 0x03C1, 0x03C5,
]);

/** Map confusable code points to a Latin ASCII skeleton equivalent. */
const SKELETON_MAP: ReadonlyMap<number, string> = new Map([
  [0x0410, 'A'], [0x0412, 'B'], [0x0415, 'E'], [0x041A, 'K'], [0x041C, 'M'], [0x041D, 'H'],
  [0x041E, 'O'], [0x0420, 'P'], [0x0421, 'C'], [0x0422, 'T'], [0x0425, 'X'],
  [0x0430, 'a'], [0x0435, 'e'], [0x043E, 'o'], [0x043F, 'n'], [0x0440, 'p'], [0x0441, 'c'],
  [0x0443, 'y'], [0x0445, 'x'],
  [0x0391, 'A'], [0x0392, 'B'], [0x0395, 'E'], [0x0396, 'Z'], [0x0397, 'H'], [0x0399, 'I'],
  [0x039A, 'K'], [0x039C, 'M'], [0x039D, 'N'], [0x039F, 'O'], [0x03A1, 'P'], [0x03A4, 'T'],
  [0x03A5, 'Y'], [0x03A7, 'X'],
  [0x03B1, 'a'], [0x03B5, 'e'], [0x03B9, 'i'], [0x03BF, 'o'], [0x03C1, 'p'], [0x03C5, 'y'],
]);

/** Script ranges for mixed-script detection. */
const SCRIPT_RANGES: ReadonlyArray<readonly [number, number, string]> = [
  [0x0041, 0x005A, 'Latin'], [0x0061, 0x007A, 'Latin'], [0x00C0, 0x024F, 'Latin'],
  [0x0370, 0x03FF, 'Greek'], [0x0400, 0x04FF, 'Cyrillic'],
  [0x0590, 0x05FF, 'Hebrew'], [0x0600, 0x06FF, 'Arabic'],
  [0x0900, 0x097F, 'Devanagari'], [0x4E00, 0x9FFF, 'CJK'],
  [0x3040, 0x309F, 'Hiragana'], [0x30A0, 0x30FF, 'Katakana'],
  [0xAC00, 0xD7AF, 'Hangul'],
  [0x1F600, 0x1F64F, 'Emoji'], [0x1F300, 0x1F5FF, 'Emoji'],
];

function scriptOf(cp: number): string {
  if ((cp >= 0x30 && cp <= 0x39) || (cp >= 0x0660 && cp <= 0x0669)) return 'Digit';
  for (const [lo, hi, name] of SCRIPT_RANGES) {
    if (cp >= lo && cp <= hi) return name;
  }
  return 'Other';
}

function isCombiningMark(cp: number): boolean {
  return (cp >= 0x0300 && cp <= 0x036F) || (cp >= 0x1AB0 && cp <= 0x1AFF) || (cp >= 0x1DC0 && cp <= 0x1DFF) || (cp >= 0x20D0 && cp <= 0x20FF) || (cp >= 0xFE20 && cp <= 0xFE2F);
}

function isIdentStart(cp: number): boolean {
  if (cp === 0x5F) return true; // underscore
  if ((cp >= 0x0041 && cp <= 0x005A) || (cp >= 0x0061 && cp <= 0x007A)) return true;
  if (cp >= 0x00C0 && cp <= 0x024F) return true; // Latin extended
  if (cp === 0x5F) return true;
  return false;
}

function isIdentContinue(cp: number): boolean {
  if (isIdentStart(cp)) return true;
  if (cp >= 0x0030 && cp <= 0x0039) return true;
  if (isCombiningMark(cp)) return true;
  if (cp >= 0x0300 && cp <= 0x036F) return true;
  if (cp === 0x200C || cp === 0x200D) return true; // ZWNJ/ZWJ allowed in continues
  return false;
}

function isIdentifier(ch: string): boolean {
  if (ch.length === 1) return isIdentStart(ch.charCodeAt(0));
  // 2-code-unit surrogate pair: check combined code point.
  if (ch.length === 2) {
    const cp = ch.charCodeAt(0) * 0x400 + ch.charCodeAt(1) - 0x35FDC00;
    return isIdentStart(cp);
  }
  return false;
}

export function looksLikeConfusable(ch: string): boolean {
  if (ch.length === 1) {
    const cp = ch.charCodeAt(0);
    return CYRILLIC_LOOKALIKE.has(cp) || GREEK_LOOKALIKE.has(cp);
  }
  if (ch.length === 2) {
    const cp = ch.charCodeAt(0) * 0x400 + ch.charCodeAt(1) - 0x35FDC00;
    return CYRILLIC_LOOKALIKE.has(cp) || GREEK_LOOKALIKE.has(cp);
  }
  return false;
}

export function checkForbiddenControls(text: string): UnicodeCheckResult {
  const findings: UnicodeSecurityFinding[] = [];
  let i = 0;
  while (i < text.length) {
    const cp = text.charCodeAt(i);
    if (cp >= 0xD800 && cp <= 0xDBFF) {
      const next = i + 1 < text.length ? text.charCodeAt(i + 1) : 0;
      if (!(next >= 0xDC00 && next <= 0xDFFF)) {
        findings.push({ code: 'GSPL-SOURCE-UNPAIRED-SURROGATE', offset: i, character: text[i]! });
      }
      i += 2;
      continue;
    }
    if (cp >= 0xDC00 && cp <= 0xDFFF) {
      findings.push({ code: 'GSPL-SOURCE-UNPAIRED-SURROGATE', offset: i, character: text[i]! });
      i += 1;
      continue;
    }
    if (BIDI_CONTROLS.has(cp)) {
      findings.push({ code: 'GSPL-SOURCE-BIDI-CONTROL', offset: i, character: text[i]! });
      i += 1;
      continue;
    }
    if (ZERO_WIDTH.has(cp)) {
      findings.push({ code: 'GSPL-SOURCE-ZERO-WIDTH', offset: i, character: text[i]! });
      i += 1;
      continue;
    }
    if (DEFAULT_IGNORABLE.has(cp)) {
      findings.push({ code: 'GSPL-SOURCE-DEFAULT-IGNORABLE', offset: i, character: text[i]! });
      i += 1;
      continue;
    }
    if (FORBIDDEN_CONTROLS.has(cp)) {
      findings.push({ code: 'GSPL-SOURCE-FORBIDDEN-CONTROL', offset: i, character: text[i]! });
      i += 1;
      continue;
    }
    if (cp === 0x09 || cp === 0x0B || cp === 0x0C) {
      // Allowed in trivia: TAB, VT, FF
      i += 1;
      continue;
    }
    i += 1;
  }
  return { findings, ok: findings.length === 0 };
}

export function checkConfusables(identifier: string): UnicodeCheckResult {
  const findings: UnicodeSecurityFinding[] = [];
  for (let i = 0; i < identifier.length; ) {
    const cp = identifier.codePointAt(i)!;
    const ch = String.fromCodePoint(cp);
    if (looksLikeConfusable(ch)) {
      findings.push({ code: 'GSPL-SOURCE-CONFUSABLE-IDENTIFIER', offset: i, character: ch });
    }
    i += ch.length;
  }
  return { findings, ok: findings.length === 0 };
}

export function normalizeIdentifier(raw: string): string {
  return raw.normalize('NFC');
}

export function isNfcNormalized(raw: string): boolean {
  return raw === raw.normalize('NFC');
}

/** Compute the confusable skeleton (lowercase, confusables mapped to ASCII). */
export function confusableSkeleton(s: string): string {
  let out = '';
  for (let i = 0; i < s.length; ) {
    const cp = s.codePointAt(i)!;
    const ch = String.fromCodePoint(cp);
    const mapped = SKELETON_MAP.get(cp);
    if (mapped !== undefined) {
      out += mapped.toLowerCase();
    } else if (cp >= 0x41 && cp <= 0x5A) {
      out += ch.toLowerCase();
    } else {
      out += ch;
    }
    i += ch.length;
  }
  return out;
}

export function analyzeIdentifier(raw: string): IdentifierIdentity {
  const findings: UnicodeSecurityFinding[] = [];
  const normalized = raw.normalize('NFC');
  if (normalized !== raw) {
    findings.push({ code: 'GSPL-SOURCE-NONNORMALIZED-IDENTIFIER', offset: 0, character: raw, message: 'identifier is not in NFC' });
  }
  // Mixed-script detection.
  const scripts = new Set<string>();
  for (let i = 0; i < normalized.length; ) {
    const cp = normalized.codePointAt(i)!;
    const ch = String.fromCodePoint(cp);
    const script = scriptOf(cp);
    if (script !== 'Other' && script !== 'Digit') scripts.add(script);
    if (looksLikeConfusable(ch)) {
      findings.push({ code: 'GSPL-SOURCE-CONFUSABLE-IDENTIFIER', offset: i, character: ch });
    }
    i += ch.length;
  }
  if (scripts.size > 1) {
    findings.push({ code: 'GSPL-SOURCE-MIXED-SCRIPT-IDENTIFIER', offset: 0, message: 'identifier mixes scripts: ' + Array.from(scripts).join(',') });
  }
  // Leading combining mark.
  if (normalized.length > 0) {
    const firstCp = normalized.codePointAt(0)!;
    if (isCombiningMark(firstCp)) {
      findings.push({ code: 'GSPL-SOURCE-LEADING-COMBINING-MARK', offset: 0 });
    }
  }
  return {
    original: raw,
    normalized,
    confusableSkeleton: confusableSkeleton(normalized),
    scripts: Array.from(scripts).sort(),
    findings,
  };
}

/** Check whether the character is a valid identifier-start (excluding ASCII digits). */
export function isIdentifierStartChar(ch: string): boolean {
  return isIdentifier(ch);
}

/** Check whether the character is a valid identifier-continue. */
export function isIdentifierContinueChar(ch: string): boolean {
  if (ch.length === 1) return isIdentContinue(ch.charCodeAt(0));
  if (ch.length === 2) {
    const cp = ch.charCodeAt(0) * 0x400 + ch.charCodeAt(1) - 0x35FDC00;
    return isIdentContinue(cp);
  }
  return false;
}
