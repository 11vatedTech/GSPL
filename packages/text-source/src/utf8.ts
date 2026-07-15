/**
 * Strict UTF-8 decoder (RFC 3629). No replacement characters. Reject invalid
 * sequences with explicit byte offsets. Used by the byte-level source loader.
 * Prompt 3 §4.
 */

export interface Utf8DecodeSuccess {
  readonly ok: true;
  readonly text: string;
  readonly hadBom: boolean;
  readonly bytesConsumed: number;
}

export interface Utf8DecodeFailure {
  readonly ok: false;
  readonly byteOffset: number;
  readonly reason: string;
  readonly context: string;
}

export type Utf8DecodeResult = Utf8DecodeSuccess | Utf8DecodeFailure;

const BOM_0 = 0xef;
const BOM_1 = 0xbb;
const BOM_2 = 0xbf;
const CTX_BYTES = 16;

export function decodeStrictUtf8(bytes: Uint8Array): Utf8DecodeResult {
  let start = 0;
  let hadBom = false;
  if (bytes.length >= 3 && bytes[0] === BOM_0 && bytes[1] === BOM_1 && bytes[2] === BOM_2) {
    hadBom = true;
    start = 3;
  }
  let out = '';
  for (let i = start; i < bytes.length; ) {
    const b0 = bytes[i]!;
    if (b0 < 0x80) { out += String.fromCharCode(b0); i += 1; continue; }
    let cp = 0;
    let extra = 0;
    if ((b0 & 0xe0) === 0xc0) {
      if (b0 < 0xc2) return reject(bytes, i, 'overlong 2-byte sequence or bare continuation');
      if (i + 1 >= bytes.length) return reject(bytes, i, 'truncated 2-byte sequence');
      const b1 = bytes[i + 1]!;
      if ((b1 & 0xc0) !== 0x80) return reject(bytes, i + 1, 'invalid continuation byte');
      cp = ((b0 & 0x1f) << 6) | (b1 & 0x3f);
      extra = 1;
    } else if ((b0 & 0xf0) === 0xe0) {
      if (i + 2 >= bytes.length) return reject(bytes, i, 'truncated 3-byte sequence');
      const b1 = bytes[i + 1]!;
      const b2 = bytes[i + 2]!;
      if ((b1 & 0xc0) !== 0x80) return reject(bytes, i + 1, 'invalid continuation byte');
      if ((b2 & 0xc0) !== 0x80) return reject(bytes, i + 2, 'invalid continuation byte');
      if (b0 === 0xe0 && b1 < 0xa0) return reject(bytes, i, 'overlong 3-byte sequence');
      if (b0 === 0xed && b1 >= 0xa0) return reject(bytes, i, 'UTF-16 surrogate encoded in UTF-8');
      cp = ((b0 & 0x0f) << 12) | ((b1 & 0x3f) << 6) | (b2 & 0x3f);
      extra = 2;
    } else if ((b0 & 0xf8) === 0xf0) {
      if (i + 3 >= bytes.length) return reject(bytes, i, 'truncated 4-byte sequence');
      const b1 = bytes[i + 1]!;
      const b2 = bytes[i + 2]!;
      const b3 = bytes[i + 3]!;
      if ((b1 & 0xc0) !== 0x80) return reject(bytes, i + 1, 'invalid continuation byte');
      if ((b2 & 0xc0) !== 0x80) return reject(bytes, i + 2, 'invalid continuation byte');
      if ((b3 & 0xc0) !== 0x80) return reject(bytes, i + 3, 'invalid continuation byte');
      if (b0 === 0xf0 && b1 < 0x90) return reject(bytes, i, 'overlong 4-byte sequence');
      if (b0 === 0xf4 && b1 >= 0x90) return reject(bytes, i, 'codepoint above U+10FFFF');
      cp = ((b0 & 0x07) << 18) | ((b1 & 0x3f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f);
      extra = 3;
    } else {
      return reject(bytes, i, 'invalid leading byte');
    }
    if (cp <= 0xffff) {
      out += String.fromCharCode(cp);
    } else {
      out += String.fromCharCode(0xd800 + ((cp - 0x10000) >> 10), 0xdc00 + ((cp - 0x10000) & 0x3ff));
    }
    i += 1 + extra;
  }
  return { ok: true, text: out, hadBom, bytesConsumed: bytes.length };
}

function reject(bytes: Uint8Array, offset: number, reason: string): Utf8DecodeFailure {
  const lo = Math.max(0, offset - CTX_BYTES);
  const hi = Math.min(bytes.length, offset + CTX_BYTES);
  let ctx = '';
  for (let i = lo; i < hi; i++) {
    const b = bytes[i]!;
    ctx += b < 0x20 || b >= 0x7f ? '\\x' + b.toString(16).padStart(2, '0') : String.fromCharCode(b);
  }
  return { ok: false, byteOffset: offset, reason, context: ctx };
}
