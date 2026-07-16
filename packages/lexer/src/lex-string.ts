
/**
 * String literal scanner with full diagnostic emission. Prompt 3 Section 9.
 * - "..." escaped strings with backslash, quote, n, r, t, 0, xNN, uNNNN, u{...}
 * - r"..." raw strings (no escapes, no interior newline)
 * - triple-quote """...""" multiline strings (preserve interior text exactly)
 *
 * Multiline strings intentionally preserve every interior code unit. No
 * implicit indentation stripping is performed at the lexical layer.
 */
import { SyntaxKind } from '@gspl/syntax-tree';
import { makeDiagnostic } from '@gspl/text-source';
import type { SourceId } from '@gspl/text-source';

export interface StringScanResult {
  readonly kind: SyntaxKind.StringLiteral | SyntaxKind.RawStringLiteral | SyntaxKind.MultilineStringLiteral | SyntaxKind.Invalid;
  readonly text: string;
  readonly width: number;
  readonly semanticValue?: string;
  readonly diagnostics: readonly ReturnType<typeof makeDiagnostic>[];
  readonly limitExceeded: boolean;
  readonly terminated: boolean;
}

export interface StringScannerOptions {
  readonly sourceId: SourceId;
  readonly maxStringCodeUnits: number;
}

export function scanStringLiteral(text: string, start: number, opts?: Partial<StringScannerOptions>): StringScanResult {
  const effective: StringScannerOptions = {
    sourceId: opts?.sourceId ?? ('' as SourceId),
    maxStringCodeUnits: opts?.maxStringCodeUnits ?? 1_048_576,
  };
  if (text.startsWith('"""', start)) return scanMultiline(text, start, effective);
  if (text.charCodeAt(start) === 0x72 && text.charCodeAt(start + 1) === 0x22) return scanRaw(text, start, effective);
  if (text.charCodeAt(start) === 0x22) return scanEscaped(text, start, effective);
  return { kind: SyntaxKind.Invalid, text: text[start] ?? '', width: 1, diagnostics: [], limitExceeded: false, terminated: false };
}

function make(code: string, message: string, span: { sourceId: SourceId; start: number; end: number }): ReturnType<typeof makeDiagnostic> {
  return makeDiagnostic({ code, message, severity: 'error', span, category: 'lex', phase: 'lex', canonical: true });
}

function invalidString(text: string, start: number, end: number, code: string, diagnostics: ReturnType<typeof makeDiagnostic>[]): StringScanResult {
  diagnostics.push(make(code, code + ' at offset ' + start, { sourceId: diagnostics[0]?.span.sourceId ?? ('' as SourceId), start, end }));
  return { kind: SyntaxKind.Invalid, text: text.slice(start, end), width: end - start, diagnostics, limitExceeded: false, terminated: false };
}

function scanEscaped(text: string, start: number, opts: StringScannerOptions): StringScanResult {
  let i = start + 1;
  let decoded = '';
  const diagnostics: ReturnType<typeof makeDiagnostic>[] = [];
  while (i < text.length) {
    if (i - start > opts.maxStringCodeUnits) {
      diagnostics.push(make('GSPL-LEX-STRING-TOO-LARGE', 'exceeded maxStringCodeUnits', { sourceId: opts.sourceId, start, end: i }));
      return { kind: SyntaxKind.Invalid, text: text.slice(start, i), width: i - start, diagnostics, limitExceeded: true, terminated: false };
    }
    const ch = text.charCodeAt(i);
    if (ch === 0x22) {
      return { kind: SyntaxKind.StringLiteral, text: text.slice(start, i + 1), width: i + 1 - start, semanticValue: decoded, diagnostics, limitExceeded: false, terminated: true };
    }
    if (ch === 0x5C) {
      if (i + 1 >= text.length) {
        diagnostics.push(make('GSPL-LEX-INVALID-ESCAPE', 'string ends in trailing backslash', { sourceId: opts.sourceId, start: i, end: i + 1 }));
        return { kind: SyntaxKind.Invalid, text: text.slice(start, i + 1), width: i + 1 - start, diagnostics, limitExceeded: false, terminated: false };
      }
      const esc = text.charCodeAt(i + 1);
      switch (esc) {
        case 0x5C: decoded += String.fromCharCode(0x5C); i += 2; continue;
        case 0x22: decoded += String.fromCharCode(0x22); i += 2; continue;
        case 0x6E: decoded += String.fromCharCode(0x0A); i += 2; continue;
        case 0x72: decoded += String.fromCharCode(0x0D); i += 2; continue;
        case 0x74: decoded += String.fromCharCode(0x09); i += 2; continue;
        case 0x30: decoded += String.fromCharCode(0x00); i += 2; continue;
        case 0x78: {
          if (i + 4 > text.length) { diagnostics.push(make('GSPL-LEX-INVALID-ESCAPE', 'short hex escape at end of string', { sourceId: opts.sourceId, start: i, end: i + 1 })); return { kind: SyntaxKind.Invalid, text: text.slice(start, i + 1), width: i + 1 - start, diagnostics, limitExceeded: false, terminated: false }; }
          const hex = text.slice(i + 2, i + 4);
          if (!/^[0-9A-Fa-f]{2}$/.test(hex)) { diagnostics.push(make('GSPL-LEX-INVALID-ESCAPE', 'invalid hex escape: ' + hex, { sourceId: opts.sourceId, start: i, end: i + 4 })); return { kind: SyntaxKind.Invalid, text: text.slice(start, i + 4), width: i + 4 - start, diagnostics, limitExceeded: false, terminated: false }; }
          const cp = parseInt(hex, 16);
          if (cp >= 0xD800 && cp <= 0xDFFF) { diagnostics.push(make('GSPL-LEX-INVALID-UNICODE-ESCAPE', 'surrogate escape value: U+' + cp.toString(16).toUpperCase(), { sourceId: opts.sourceId, start: i, end: i + 4 })); return { kind: SyntaxKind.Invalid, text: text.slice(start, i + 4), width: i + 4 - start, diagnostics, limitExceeded: false, terminated: false }; }
          decoded += String.fromCharCode(cp);
          i += 4;
          continue;
        }
        case 0x75: {
          if (i + 2 < text.length && text.charCodeAt(i + 2) === 0x7B) {
            const close = text.indexOf('}', i + 3);
            if (close < 0) { diagnostics.push(make('GSPL-LEX-INVALID-UNICODE-ESCAPE', 'unterminated braced unicode escape', { sourceId: opts.sourceId, start: i, end: text.length })); return { kind: SyntaxKind.Invalid, text: text.slice(start, text.length), width: text.length - start, diagnostics, limitExceeded: false, terminated: false }; }
            const hex = text.slice(i + 3, close);
            if (!/^[0-9A-Fa-f]{1,6}$/.test(hex)) { diagnostics.push(make('GSPL-LEX-INVALID-UNICODE-ESCAPE', 'malformed braced unicode escape: ' + hex, { sourceId: opts.sourceId, start: i, end: close + 1 })); return { kind: SyntaxKind.Invalid, text: text.slice(start, close + 1), width: close + 1 - start, diagnostics, limitExceeded: false, terminated: false }; }
            const cp = parseInt(hex, 16);
            if (cp > 0x10FFFF) { diagnostics.push(make('GSPL-LEX-INVALID-UNICODE-ESCAPE', 'code point above U+10FFFF: ' + cp, { sourceId: opts.sourceId, start: i, end: close + 1 })); return { kind: SyntaxKind.Invalid, text: text.slice(start, close + 1), width: close + 1 - start, diagnostics, limitExceeded: false, terminated: false }; }
            if (cp >= 0xD800 && cp <= 0xDFFF) { diagnostics.push(make('GSPL-LEX-INVALID-UNICODE-ESCAPE', 'surrogate scalar: U+' + cp.toString(16).toUpperCase(), { sourceId: opts.sourceId, start: i, end: close + 1 })); return { kind: SyntaxKind.Invalid, text: text.slice(start, close + 1), width: close + 1 - start, diagnostics, limitExceeded: false, terminated: false }; }
            decoded += String.fromCodePoint(cp);
            i = close + 1;
            continue;
          }
          if (i + 6 > text.length) { diagnostics.push(make('GSPL-LEX-INVALID-UNICODE-ESCAPE', 'short codepoint escape at end', { sourceId: opts.sourceId, start: i, end: i + 1 })); return { kind: SyntaxKind.Invalid, text: text.slice(start, i + 1), width: i + 1 - start, diagnostics, limitExceeded: false, terminated: false }; }
          const hex4 = text.slice(i + 2, i + 6);
          if (!/^[0-9A-Fa-f]{4}$/.test(hex4)) { diagnostics.push(make('GSPL-LEX-INVALID-UNICODE-ESCAPE', 'invalid unicode escape: ' + hex4, { sourceId: opts.sourceId, start: i, end: i + 6 })); return { kind: SyntaxKind.Invalid, text: text.slice(start, i + 6), width: i + 6 - start, diagnostics, limitExceeded: false, terminated: false }; }
          const cp = parseInt(hex4, 16);
          if (cp >= 0xD800 && cp <= 0xDFFF) { diagnostics.push(make('GSPL-LEX-INVALID-UNICODE-ESCAPE', 'surrogate escape: U+' + cp.toString(16).toUpperCase(), { sourceId: opts.sourceId, start: i, end: i + 6 })); return { kind: SyntaxKind.Invalid, text: text.slice(start, i + 6), width: i + 6 - start, diagnostics, limitExceeded: false, terminated: false }; }
          decoded += String.fromCharCode(cp);
          i += 6;
          continue;
        }
        default:
          diagnostics.push(make('GSPL-LEX-INVALID-ESCAPE', 'unknown escape: \\' + String.fromCharCode(esc), { sourceId: opts.sourceId, start: i, end: i + 2 }));
          return { kind: SyntaxKind.Invalid, text: text.slice(start, i + 2), width: i + 2 - start, diagnostics, limitExceeded: false, terminated: false };
      }
    }
    if (ch === 0x0A) {
      diagnostics.push(make('GSPL-LEX-INVALID-ESCAPE', 'newline in ordinary string', { sourceId: opts.sourceId, start: i, end: i + 1 }));
      return { kind: SyntaxKind.Invalid, text: text.slice(start, i + 1), width: i + 1 - start, diagnostics, limitExceeded: false, terminated: false };
    }
    decoded += String.fromCharCode(ch);
    i += (ch >= 0xd800 && ch <= 0xdbff) ? 2 : 1;
  }
  diagnostics.push(make('GSPL-LEX-UNTERMINATED-STRING', 'string is not terminated', { sourceId: opts.sourceId, start, end: text.length }));
  return { kind: SyntaxKind.Invalid, text: text.slice(start, text.length), width: text.length - start, diagnostics, limitExceeded: false, terminated: false };
}

function scanRaw(text: string, start: number, opts: StringScannerOptions): StringScanResult {
  let i = start + 2;
  let value = '';
  const diagnostics: ReturnType<typeof makeDiagnostic>[] = [];
  while (i < text.length) {
    if (i - start > opts.maxStringCodeUnits) {
      diagnostics.push(make('GSPL-LEX-STRING-TOO-LARGE', 'exceeded maxStringCodeUnits', { sourceId: opts.sourceId, start, end: i }));
      return { kind: SyntaxKind.Invalid, text: text.slice(start, i), width: i - start, diagnostics, limitExceeded: true, terminated: false };
    }
    const ch = text.charCodeAt(i);
    if (ch === 0x22) {
      return { kind: SyntaxKind.RawStringLiteral, text: text.slice(start, i + 1), width: i + 1 - start, semanticValue: value, diagnostics, limitExceeded: false, terminated: true };
    }
    if (ch === 0x0A) {
      diagnostics.push(make('GSPL-LEX-INVALID-ESCAPE', 'newline in raw string', { sourceId: opts.sourceId, start: i, end: i + 1 }));
      return { kind: SyntaxKind.Invalid, text: text.slice(start, i + 1), width: i + 1 - start, diagnostics, limitExceeded: false, terminated: false };
    }
    value += String.fromCharCode(ch);
    i += (ch >= 0xd800 && ch <= 0xdbff) ? 2 : 1;
  }
  diagnostics.push(make('GSPL-LEX-UNTERMINATED-STRING', 'raw string is not terminated', { sourceId: opts.sourceId, start, end: text.length }));
  return { kind: SyntaxKind.Invalid, text: text.slice(start, text.length), width: text.length - start, diagnostics, limitExceeded: false, terminated: false };
}

function scanMultiline(text: string, start: number, opts: StringScannerOptions): StringScanResult {
  let i = start + 3;
  let value = '';
  const diagnostics: ReturnType<typeof makeDiagnostic>[] = [];
  while (i < text.length) {
    if (i - start > opts.maxStringCodeUnits) {
      diagnostics.push(make('GSPL-LEX-STRING-TOO-LARGE', 'exceeded maxStringCodeUnits', { sourceId: opts.sourceId, start, end: i }));
      return { kind: SyntaxKind.Invalid, text: text.slice(start, i), width: i - start, diagnostics, limitExceeded: true, terminated: false };
    }
    if (text.charCodeAt(i) === 0x22 && text.startsWith('"""', i)) {
      return { kind: SyntaxKind.MultilineStringLiteral, text: text.slice(start, i + 3), width: i + 3 - start, semanticValue: value, diagnostics, limitExceeded: false, terminated: true };
    }
    const ch = text.charCodeAt(i);
    value += String.fromCharCode(ch);
    i += (ch >= 0xd800 && ch <= 0xdbff) ? 2 : 1;
  }
  diagnostics.push(make('GSPL-LEX-UNTERMINATED-STRING', 'multiline string is not terminated', { sourceId: opts.sourceId, start, end: text.length }));
  return { kind: SyntaxKind.Invalid, text: text.slice(start, text.length), width: text.length - start, diagnostics, limitExceeded: false, terminated: false };
}
