/**
 * Unified code-point reader Prompt 3 Final Unlock §3.
 */
export interface CodePointRead {
  readonly codePoint: number | undefined;
  readonly utf16Width: 1 | 2;
  readonly unpairedSurrogate: boolean;
}

export function readSourceCodePoint(text: string, offset: number): CodePointRead {
  const length = text.length;
  if (offset < 0 || offset >= length) {
    return { codePoint: undefined, utf16Width: 1, unpairedSurrogate: false };
  }
  const cu = text.charCodeAt(offset);
  if (cu >= 0xD800 && cu <= 0xDBFF) {
    if (offset + 1 < length) {
      const lo = text.charCodeAt(offset + 1);
      if (lo >= 0xDC00 && lo <= 0xDFFF) {
        const cp = (cu - 0xD800) * 0x400 + (lo - 0xDC00) + 0x10000;
        return { codePoint: cp, utf16Width: 2, unpairedSurrogate: false };
      }
    }
    return { codePoint: cu, utf16Width: 1, unpairedSurrogate: true };
  }
  if (cu >= 0xDC00 && cu <= 0xDFFF) {
    return { codePoint: cu, utf16Width: 1, unpairedSurrogate: true };
  }
  return { codePoint: cu, utf16Width: 1, unpairedSurrogate: false };
}

export function advanceAfter(source: { readonly codePoint: number | undefined; readonly utf16Width: 1 | 2 }): number {
  if (source.codePoint === undefined) return 0;
  return source.utf16Width;
}
