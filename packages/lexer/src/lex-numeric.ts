/**
 * Numeric literal scanning. Prompt 3 §17.
 * - Decimal, hex (0x), binary (0b), octal (0o) integers stored as bigint
 * - Decimal floats stored as raw string
 * - Digit separator '_' permitted between digits
 */
import { SyntaxKind } from '../../syntax-tree/src/index.js';

export interface NumericResult {
  readonly kind: SyntaxKind.IntegerLiteral | SyntaxKind.FloatLiteral | SyntaxKind.Invalid;
  readonly text: string;
  readonly width: number;
  readonly semanticValue?: bigint | string;
  readonly negativeZero?: boolean;
}

export function scanNumericLiteral(text: string, start: number): NumericResult {
  const begin = start;
  let i = start;
  let radix: 2 | 8 | 10 | 16 = 10;
  if (text.charCodeAt(i) === 0x30 && i + 1 < text.length) {
    const next = text.charCodeAt(i + 1);
    if (next === 0x78 || next === 0x58) { radix = 16; i += 2; }
    else if (next === 0x62 || next === 0x42) { radix = 2; i += 2; }
    else if (next === 0x6f || next === 0x4f) { radix = 8; i += 2; }
  }
  let raw = '';
  let sawDigit = false;
  let sawDot = false;
  let sawExponent = false;
  let isFloat = false;
  for (; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    if (ch === 0x5F) {
      if (!sawDigit) return { kind: SyntaxKind.Invalid, text: text[begin]!, width: 1 };
      const nextCh = i + 1 < text.length ? text.charCodeAt(i + 1) : 0;
      const nextIsDigit = (radix === 16) ? isHexDigit(nextCh) : (radix === 8) ? nextCh >= 0x30 && nextCh <= 0x37 : (radix === 2) ? nextCh === 0x30 || nextCh === 0x31 : isDecDigit(nextCh);
      if (!nextIsDigit) return { kind: SyntaxKind.Invalid, text: text[begin]!, width: 1 };
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
  if (!sawDigit) return { kind: SyntaxKind.Invalid, text: text[begin]!, width: 1 };
  const finalText = text.slice(begin, i);
  if (isFloat) {
    return { kind: SyntaxKind.FloatLiteral, text: finalText, width: i - begin, semanticValue: finalText };
  }
  const cleaned = raw.replace(/_/g, '');
  try {
    const value = BigInt(radix === 10 ? cleaned : '0' + (radix === 16 ? 'x' : radix === 2 ? 'b' : 'o') + cleaned);
    return { kind: SyntaxKind.IntegerLiteral, text: finalText, width: i - begin, semanticValue: value };
  } catch {
    return { kind: SyntaxKind.Invalid, text: finalText, width: i - begin };
  }
}

function isDecDigit(ch: number): boolean {
  return ch >= 0x30 && ch <= 0x39;
}

function isHexDigit(ch: number): boolean {
  return (ch >= 0x30 && ch <= 0x39) || (ch >= 0x61 && ch <= 0x66) || (ch >= 0x41 && ch <= 0x46);
}
