
/**
 * Numeric literal scanner with full diagnostic emission. Prompt 3 Section 8.
 * - Decimal, hex (0x), binary (0b), octal (0o) integers stored as bigint.
 * - Decimal floats stored as raw string.
 * - Digit separator '_' permitted between digits.
 *
 * Consumes the longest safely identifiable malformed numeric sequence as one
 * invalid token so that the parser receives one bounded error region. NaN and
 * Infinity are not valid GSPL numeric literals in language version 1.0.
 */
import { SyntaxKind } from '@gspl/syntax-tree';
import { makeDiagnostic } from '@gspl/text-source';

export interface NumericScanResult {
  readonly kind: SyntaxKind.IntegerLiteral | SyntaxKind.FloatLiteral | SyntaxKind.Invalid;
  readonly text: string;
  readonly width: number;
  readonly semanticValue?: bigint | string;
  readonly negativeZero?: boolean;
  readonly diagnostics: readonly ReturnType<typeof makeDiagnostic>[];
  readonly limitExceeded: boolean;
  readonly terminated: boolean;
}

export interface NumericScannerOptions {
  readonly sourceId: import('@gspl/text-source').SourceId;
  readonly maxNumericCodeUnits: number;
}

export function scanNumericLiteral(text: string, start: number, opts?: Partial<NumericScannerOptions>): NumericScanResult {
  const begin = start;
  let i = start;
  const sourceId: NumericScannerOptions['sourceId'] = opts?.sourceId ?? ('' as NumericScannerOptions['sourceId']);
  const maxNumericCodeUnits: number = opts?.maxNumericCodeUnits ?? 4096;
  let radix: 2 | 8 | 10 | 16 = 10;
  let diagnostics: ReturnType<typeof makeDiagnostic>[] = [];
  const pushCode = (code: string, message: string, end: number) => {
    diagnostics.push(
      makeDiagnostic({
        code,
        message,
        severity: 'error',
        span: { sourceId, start: begin, end },
        category: 'lex',
        phase: 'lex',
        canonical: true,
      }),
    );
  };
  // NaN / Infinity are explicitly forbidden.
  if (text.startsWith('NaN', begin)) { pushCode('GSPL-LEX-NONFINITE-NUMERIC', 'NaN is not a valid GSPL numeric literal', begin + 3); return { kind: SyntaxKind.Invalid, text: 'NaN', width: 3, diagnostics, limitExceeded: false, terminated: false }; }
  if (text.startsWith('Infinity', begin)) { pushCode('GSPL-LEX-NONFINITE-NUMERIC', 'Infinity is not a valid GSPL numeric literal', begin + 8); return { kind: SyntaxKind.Invalid, text: 'Infinity', width: 8, diagnostics, limitExceeded: false, terminated: false }; }
  if (text.charCodeAt(i) === 0x30 && i + 1 < text.length) {
    const next = text.charCodeAt(i + 1);
    if (next === 0x78 || next === 0x58) { radix = 16; i += 2; }
    else if (next === 0x62 || next === 0x42) { radix = 2; i += 2; }
    else if (next === 0x6f || next === 0x4f) { radix = 8; i += 2; }
  } else if (text.charCodeAt(i) === 0x30 && radix === 10 && (i + 1 >= text.length || !isDecDigit(text.charCodeAt(i + 1)))) {
    // bare '0' (float path or terminator) — accept as decimal-zero digit below on
    // the regular loop entry.
  } else if (text.charCodeAt(i) === 0x30 && i + 1 >= text.length) {
    // '0' at EOF — accept below.
  }
  let raw = '';
  let sawDigit = false;
  let sawDot = false;
  let sawExponent = false;
  let isFloat = false;
  let limitedHere = false;
  for (; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    if (ch === 0x5F) {
      if (!sawDigit) {
        pushCode('GSPL-LEX-INVALID-DIGIT-SEPARATOR', "digit separator '_' must follow a digit", i + 1);
        const end = consumeMalformedRun(text, i + 1);
        return { kind: SyntaxKind.Invalid, text: text.slice(begin, end), width: end - begin, diagnostics, limitExceeded: false, terminated: false };
      }
      const nextCh = i + 1 < text.length ? text.charCodeAt(i + 1) : 0;
      const nextIsDigit = (radix === 16) ? isHexDigit(nextCh) : (radix === 8) ? nextCh >= 0x30 && nextCh <= 0x37 : (radix === 2) ? nextCh === 0x30 || nextCh === 0x31 : isDecDigit(nextCh);
      if (!nextIsDigit) {
        pushCode('GSPL-LEX-INVALID-DIGIT-SEPARATOR', "digit separator '_' must be followed by a digit", i + 1);
        const end = consumeMalformedRun(text, i + 1);
        return { kind: SyntaxKind.Invalid, text: text.slice(begin, end), width: end - begin, diagnostics, limitExceeded: false, terminated: false };
      }
      raw += '_';
      continue;
    }
    if (ch === 0x2E && !sawDot && !sawExponent && radix === 10) {
      const nextCh = i + 1 < text.length ? text.charCodeAt(i + 1) : 0;
      if (!isDecDigit(nextCh)) break;
      sawDot = true;
      isFloat = true;
      raw += '.';
      continue;
    }
    if ((ch === 0x65 || ch === 0x45) && radix === 10 && sawDigit && !sawExponent) {
      sawExponent = true;
      isFloat = true;
      raw += String.fromCharCode(ch);
      if (i + 1 < text.length) {
        const signCh = text.charCodeAt(i + 1);
        if (signCh === 0x2B || signCh === 0x2D) {
          raw += String.fromCharCode(signCh);
          i++;
        }
      }
      // If exponent has no following digit, this is malformed.
      const afterSign = i + 1 < text.length ? text.charCodeAt(i + 1) : -1;
      if (afterSign < 0 || !isDecDigit(afterSign)) {
        pushCode('GSPL-LEX-INVALID-FLOAT', 'malformed exponent: missing digits', i + 1);
        const end = consumeMalformedRun(text, i + 1);
        return { kind: SyntaxKind.Invalid, text: text.slice(begin, end), width: end - begin, diagnostics, limitExceeded: false, terminated: false };
      }
      continue;
    }
    const isDigit = (radix === 16) ? isHexDigit(ch) : (radix === 8) ? ch >= 0x30 && ch <= 0x37 : (radix === 2) ? ch === 0x30 || ch === 0x31 : isDecDigit(ch);
    if (isDigit) {
      raw += String.fromCharCode(ch);
      sawDigit = true;
      continue;
    }
    break;
  }
  if (radix !== 10 && !sawDigit) {
    // forms like '0x', '0b', '0o' with no further digits.
    pushCode('GSPL-LEX-INVALID-INTEGER', 'integer literal missing digits for radix ' + radix, i);
    return { kind: SyntaxKind.Invalid, text: text.slice(begin, i), width: i - begin, diagnostics, limitExceeded: false, terminated: false };
  }
  if (!sawDigit) {
    pushCode('GSPL-LEX-INVALID-INTEGER', 'numeric literal has no digits', i);
    return { kind: SyntaxKind.Invalid, text: text[begin] ?? '', width: 1, diagnostics, limitExceeded: false, terminated: false };
  }
  if (i - begin > maxNumericCodeUnits) {
    diagnostics.push(makeDiagnostic({ code: 'GSPL-LEX-NUMERIC-TOO-LARGE', message: 'numeric literal exceeds maxNumericCodeUnits: ' + (i - begin), severity: 'error', span: { sourceId, start: begin, end: i }, category: 'lex', phase: 'lex', canonical: true }));
    limitedHere = true;
    // Prompt 3 §9: stop building normalized digits and DO NOT perform BigInt
    // conversion. Emit one Invalid token and return a low-allocation result.
    return { kind: SyntaxKind.Invalid, text: text.slice(begin, i), width: i - begin, diagnostics, limitExceeded: limitedHere, terminated: false };
  }
  const finalText = text.slice(begin, i);
  if (isFloat) {
    return { kind: SyntaxKind.FloatLiteral, text: finalText, width: i - begin, semanticValue: finalText, diagnostics, limitExceeded: limitedHere, terminated: true };
  }
  const cleaned = raw.replace(/_/g, '');
  try {
    const value = BigInt(radix === 10 ? cleaned : '0' + (radix === 16 ? 'x' : radix === 2 ? 'b' : 'o') + cleaned);
    return { kind: SyntaxKind.IntegerLiteral, text: finalText, width: i - begin, semanticValue: value, diagnostics, limitExceeded: limitedHere, terminated: true };
  } catch {
    pushCode('GSPL-LEX-INVALID-INTEGER', 'integer literal value out of range', i);
    return { kind: SyntaxKind.Invalid, text: finalText, width: i - begin, diagnostics, limitExceeded: limitedHere, terminated: false };
  }
}

/**
 * Consume the longest malformed run of digits / separators / dot / exponent that
 * still belongs to this numeric literal, so the caller can emit one Invalid
 * token instead of cascading errors.
 */
function consumeMalformedRun(text: string, start: number): number {
  let j = start;
  while (j < text.length) {
    const ch = text.charCodeAt(j);
    if (isDecDigit(ch) || ch === 0x5F || ch === 0x2E || ch === 0x65 || ch === 0x45 || ch === 0x2B || ch === 0x2D) {
      j++;
      continue;
    }
    break;
  }
  return j;
}

function isDecDigit(ch: number): boolean {
  return ch >= 0x30 && ch <= 0x39;
}
function isHexDigit(ch: number): boolean {
  return (ch >= 0x30 && ch <= 0x39) || (ch >= 0x61 && ch <= 0x66) || (ch >= 0x41 && ch <= 0x46);
}
