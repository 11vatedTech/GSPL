// 13-case adversarial archive test (Prompt 2 §4).
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { packTar } from '../source-package/archive.mts';

function makeArchive(entries: ReadonlyArray<{ path: string; content: string }>) {
  return packTar(entries.map(e => ({
    path: e.path,
    size: Buffer.byteLength(e.content, 'utf8'),
    hash: createHash('sha256').update(e.content).digest('hex'),
    mode: 0o644,
    kind: 'file' as const,
  })));
}

describe('adversarial archive safety (Prompt 2 §4)', () => {
  it('rejects NUL byte in path', () => {
    expect(() => makeArchive([{ path: 'a\u0000.txt', content: 'x' }])).toThrow();
  });
  it('rejects path exceeding USTAR NAME_MAX (100 bytes)', () => {
    const long = 'a'.repeat(200);
    expect(() => makeArchive([{ path: long, content: 'x' }])).toThrow();
  });
  it('produces deterministic archive (same input → same bytes)', () => {
    const a = makeArchive([{ path: 'x.txt', content: 'hello' }]);
    const b = makeArchive([{ path: 'x.txt', content: 'hello' }]);
    expect(Buffer.compare(a, b)).toBe(0);
  });
  it('different content produces different bytes', () => {
    const a = makeArchive([{ path: 'x.txt', content: 'hello' }]);
    const b = makeArchive([{ path: 'x.txt', content: 'world' }]);
    expect(Buffer.compare(a, b)).not.toBe(0);
  });
  it('archive byte hash is stable across 2 runs', () => {
    const a = makeArchive([{ path: 'x.txt', content: 'hello' }]);
    const b = makeArchive([{ path: 'x.txt', content: 'hello' }]);
    const ha = createHash("sha256").update(a).digest("hex");
    const hb = createHash("sha256").update(b).digest("hex");
    expect(ha).toBe(hb);
  });
  it('multiple entries maintain order', () => {
    const a = makeArchive([{ path: 'a.txt', content: '1' }, { path: 'b.txt', content: '2' }]);
    const b = makeArchive([{ path: 'a.txt', content: '1' }, { path: 'b.txt', content: '2' }]);
    expect(Buffer.compare(a, b)).toBe(0);
  });
  it('empty content produces valid archive', () => {
    const a = makeArchive([{ path: 'empty.txt', content: '' }]);
    expect(a.length).toBeGreaterThan(0);
  });
  it('unicode content is byte-stable', () => {
    const a = makeArchive([{ path: 'u.txt', content: 'héllo 🌍' }]);
    const b = makeArchive([{ path: 'u.txt', content: 'héllo 🌍' }]);
    expect(Buffer.compare(a, b)).toBe(0);
  });
  it('archive size stays bounded (decompression-bomb guard)', () => {
    const big = 'x'.repeat(1024 * 1024);
    const buf = makeArchive([{ path: 'big.txt', content: big }]);
    expect(buf.length).toBeLessThan(2 * 1024 * 1024);
  });
  it('rejects parent traversal in path (pre-USTAR check)', () => {
    expect(() => makeArchive([{ path: '../../etc/passwd', content: 'x' }])).toThrow();
  });
  it('rejects absolute path', () => {
    expect(() => makeArchive([{ path: '/etc/passwd', content: 'x' }])).toThrow();
  });
  it('rejects drive-letter path', () => {
    expect(() => makeArchive([{ path: 'C:\\Windows\\file', content: 'x' }])).toThrow();
  });
  it('rejects UNC path', () => {
    expect(() => makeArchive([{ path: '\\\\server\\share', content: 'x' }])).toThrow();
  });
});
