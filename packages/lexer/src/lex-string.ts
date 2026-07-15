/**
 * String literal scanning. Prompt 3 §18.
 * - "..." escaped strings with backslash, quote, n, r, t, 0, xNN, uNNNN, u{...}
 * - r"..." raw strings (no escapes)
 * - triple-quote multiline strings (preserve interior text)
 */
import { SyntaxKind } from '../../syntax-tree/src/index.js';

export interface StringResult {
  readonly kind: SyntaxKind.StringLiteral | SyntaxKind.RawStringLiteral | SyntaxKind.MultilineStringLiteral | SyntaxKind.Invalid;
  readonly text: string;
  readonly width: number;
  readonly semanticValue?: string;
}

export function scanStringLiteral(text: string, start: number): StringResult {
  if (text.startsWith('"""', start)) return scanMultiline(text, start);
  if (text.charCodeAt(start) === 0x72 && text.charCodeAt(start + 1) === 0x22) return scanRaw(text, start);
  if (text.charCodeAt(start) === 0x22) return scanEscaped(text, start);
  return { kind: SyntaxKind.Invalid, text: text[start]!, width: 1 };
}

function scanEscaped(text: string, start: number): StringResult {
  let i = start + 1;
  let decoded = '';
  while (i < text.length) {
    const ch = text.charCodeAt(i);
    if (ch === 0x22) {
      return { kind: SyntaxKind.StringLiteral, text: text.slice(start, i + 1), width: i + 1 - start, semanticValue: decoded };
    }
    if (ch === 0x5C) {
      if (i + 1 >= text.length) return invalidString(text, start, i + 1);
      const esc = text.charCodeAt(i + 1);
      switch (esc) {
        case 0x5C: decoded += String.fromCharCode(0x5C); i += 2; continue;
        case 0x22: decoded += String.fromCharCode(0x22); i += 2; continue;
        case 0x6E: decoded += String.fromCharCode(0x0A); i += 2; continue;
        case 0x72: decoded += String.fromCharCode(0x0D); i += 2; continue;
        case 0x74: decoded += String.fromCharCode(0x09); i += 2; continue;
        case 0x30: decoded += String.fromCharCode(0x00); i += 2; continue;
        case 0x78: {
          if (i + 3 >= text.length) return invalidString(text, start, i + 1);
          const hex = text.slice(i + 2, i + 4);
          const cp = parseInt(hex, 16);
          if (Number.isNaN(cp)) return invalidString(text, start, i + 1);
          decoded += String.fromCharCode(cp);
          i += 4;
          continue;
        }
        case 0x75: {
          if (i + 2 < text.length && text.charCodeAt(i + 2) === 0x7B) {
            const close = text.indexOf('}', i + 3);
            if (close < 0) return invalidString(text, start, i + 1);
            const hex = text.slice(i + 3, close);
            const cp = parseInt(hex, 16);
            if (Number.isNaN(cp) || cp < 0 || cp > 0x10ffff) return invalidString(text, start, i + 1);
            decoded += String.fromCodePoint(cp);
            i = close + 1;
            continue;
          }
          if (i + 5 >= text.length) return invalidString(text, start, i + 1);
          const hex = text.slice(i + 2, i + 6);
          const cp = parseInt(hex, 16);
          if (Number.isNaN(cp)) return invalidString(text, start, i + 1);
          decoded += String.fromCharCode(cp);
          i += 6;
          continue;
        }
        default:
          return invalidString(text, start, i + 1);
      }
    }
    if (ch === 0x0A) return invalidString(text, start, i);
    decoded += String.fromCharCode(ch);
    i += (ch >= 0xd800 && ch <= 0xdbff) ? 2 : 1;
  }
  return invalidString(text, start, i);
}

function scanRaw(text: string, start: number): StringResult {
  let i = start + 2;
  let value = '';
  while (i < text.length) {
    const ch = text.charCodeAt(i);
    if (ch === 0x22) {
      return { kind: SyntaxKind.RawStringLiteral, text: text.slice(start, i + 1), width: i + 1 - start, semanticValue: value };
    }
    if (ch === 0x0A) return invalidString(text, start, i);
    value += String.fromCharCode(ch);
    i += (ch >= 0xd800 && ch <= 0xdbff) ? 2 : 1;
  }
  return invalidString(text, start, i);
}

function scanMultiline(text: string, start: number): StringResult {
  let i = start + 3;
  let value = '';
  while (i < text.length) {
    if (text.charCodeAt(i) === 0x22 && text.startsWith('"""', i)) {
      return { kind: SyntaxKind.MultilineStringLiteral, text: text.slice(start, i + 3), width: i + 3 - start, semanticValue: value };
    }
    const ch = text.charCodeAt(i);
    value += String.fromCharCode(ch);
    i += (ch >= 0xd800 && ch <= 0xdbff) ? 2 : 1;
  }
  return invalidString(text, start, i);
}

function invalidString(text: string, start: number, end: number): StringResult {
  return { kind: SyntaxKind.Invalid, text: text.slice(start, end), width: end - start };
}
