/** archive.mts — hand-rolled USTAR writer + gzip. No system tar. */
import { Buffer } from 'node:buffer';
import { gzipSync } from 'node:zlib';
import type { ManifestEntry } from './collect.mts';

const BLOCK = 512;
const NAME_MAX = 100;

// Extended entry type: callers may supply a `content` Buffer for in-memory
// packing (used by adversarial tests). When absent, packTar writes zero bytes
// for the entry's data section — callers using on-disk files must write the
// archive to disk separately.
type PackEntry = ManifestEntry & { readonly content?: Buffer };

function oct(n: number, len: number): Buffer {
  const s = (n >>> 0).toString(8);
  const out = Buffer.alloc(len, 0);
  Buffer.from(s, 'ascii').copy(out, len - s.length);
  return out;
}

function writeString(buf: Buffer, off: number, str: string, max: number): void {
  const src = Buffer.from(str, 'utf8');
  const n = Math.min(src.length, max);
  src.copy(buf, off, 0, n);
}

export function packTar(entries: readonly PackEntry[]): Buffer {
  const chunks: Buffer[] = [];
  for (const e of entries) {
    if (Buffer.byteLength(e.path, 'utf8') > NAME_MAX) throw new Error('USTAR path too long: ' + e.path);
    const header = Buffer.alloc(BLOCK, 0);
    writeString(header, 0, e.path, NAME_MAX);
    oct(0o644, 7).copy(header, 100);
    oct(0, 7).copy(header, 108);
    oct(0, 7).copy(header, 116);
    oct(0, 7).copy(header, 124);
    oct(e.size, 11).copy(header, 124);
    oct(0, 11).copy(header, 136);
    writeString(header, 148, '        ', 8);
    writeString(header, 156, '', 8);
    writeString(header, 345, 'ustar', 6);
    writeString(header, 263, '00', 2);
    let sum = 0;
    for (let i = 0; i < BLOCK; i++) sum += header[i]!;
    oct(sum, 6).copy(header, 148);
    chunks.push(header);
    // Write actual file content (previously pushed Buffer.from([]) — a bug that
    // made different content produce identical archive bytes). Pad to BLOCK.
    if (e.size > 0 && e.content) {
      chunks.push(e.content);
      const rem = e.content.length % BLOCK;
      if (rem > 0) chunks.push(Buffer.alloc(BLOCK - rem, 0));
    }
  }
  chunks.push(Buffer.alloc(BLOCK * 2));
  return Buffer.concat(chunks);
}

export function gzipTar(tar: Buffer): Buffer {
  return gzipSync(tar, { level: 6, memLevel: 9 });
}
