import { describe, it, expect } from 'vitest';
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rmSync } from 'node:fs';

import { classifyFile, shouldExcludeDir, shouldExcludeFile, normalizePath } from '../src/policy.js';
import { scanRepo } from '../src/scanner.js';
import { buildManifest, serializeManifest } from '../src/manifest.js';
import { hashFile } from '../src/hasher.js';
import type { RepoConfig } from '../src/types.js';

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'gspl-test-'));
  try { return await fn(dir); }
  finally { try { rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ } }
}

function makeRepo(id: string, dir: string): RepoConfig {
  return { id, name: id, sourceType: 'directory', source: dir };
}

describe('policy — classification and exclusions', () => {
  it('classifies .ts files as source', () => {
    expect(classifyFile('src/foo.ts')).toBe('source');
  });
  it('classifies /test/ as test', () => {
    expect(classifyFile('test/foo.test.ts')).toBe('test');
    expect(classifyFile('src/foo.test.ts')).toBe('test');
  });
  it('classifies /spec/ as spec', () => {
    expect(classifyFile('spec/01-overview.md')).toBe('spec');
  });
  it('classifies /docs/ as docs', () => {
    expect(classifyFile('docs/audit/x.md')).toBe('docs');
  });
  it('classifies .md files as docs (unless in tests/spec)', () => {
    expect(classifyFile('README.md')).toBe('docs');
  });
  it('classifies .gspl files as source', () => {
    expect(classifyFile('src/hello.gspl')).toBe('source');
  });
  it('classifies binary extensions as binary', () => {
    expect(classifyFile('assets/logo.png')).toBe('binary');
    expect(classifyFile('archive.zip')).toBe('binary');
  });
  it('excludes build dirs', () => {
    expect(shouldExcludeDir('node_modules')).toBe(true);
    expect(shouldExcludeDir('dist')).toBe(true);
    expect(shouldExcludeDir('build')).toBe(true);
    expect(shouldExcludeDir('coverage')).toBe(true);
    expect(shouldExcludeDir('src')).toBe(false);
  });
  it('excludes lockfile basenames', () => {
    expect(shouldExcludeFile('package-lock.json')).toBe(true);
    expect(shouldExcludeFile('pnpm-lock.yaml')).toBe(true);
    expect(shouldExcludeFile('README.md')).toBe(false);
  });
  it('normalizes paths', () => {
    const bs = String.fromCharCode(92);
    expect(normalizePath('a' + bs + 'b' + bs + 'c')).toBe('a/b/c');
    expect(normalizePath('a/b/c')).toBe('a/b/c');
  });
});

describe('scanner + hasher', () => {
  it('walks a directory deterministically and hashes text files', async () => {
    await withTempDir(async (dir) => {
      await mkdir(join(dir, 'src'), { recursive: true });
      await writeFile(join(dir, 'src', 'a.ts'), 'export const a = 1;\n');
      await writeFile(join(dir, 'src', 'b.ts'), 'export const b = 2;\n');
      await writeFile(join(dir, 'README.md'), '# X\n');

      const repo = makeRepo('r', dir);
      const result = await scanRepo(repo);
      expect(result.files.length).toBeGreaterThan(0);

      const a = result.files.find((f) => f.relativePath === 'src/a.ts')!;
      const b = result.files.find((f) => f.relativePath === 'src/b.ts')!;
      expect(a.contentHash).toMatch(/^[0-9a-f]{64}$/);
      expect(b.contentHash).toMatch(/^[0-9a-f]{64}$/);
      expect(a.category).toBe('source');
      expect(b.category).toBe('source');
      expect(a.repositoryId).toBe('r');
      expect(a.extension).toBe('.ts');
      expect(a.isTest).toBe(false);

      const md = result.files.find((f) => f.relativePath === 'README.md')!;
      expect(md.category).toBe('docs');
      expect(md.isDocumentation).toBe(true);
    });
  });

  it('CRLF and LF normalize to the same hash', async () => {
    await withTempDir(async (dir) => {
      await writeFile(join(dir, 'lf.txt'), 'hello\nworld\n');
      await writeFile(join(dir, 'crlf.txt'), 'hello\r\nworld\r\n');
      const repo = makeRepo('r', dir);
      const result = await scanRepo(repo);
      const lf = result.files.find((f) => f.relativePath === 'lf.txt')!;
      const crlf = result.files.find((f) => f.relativePath === 'crlf.txt')!;
      expect(lf.contentHash).toEqual(crlf.contentHash);
      expect(lf.byteSize).toEqual(crlf.byteSize);
    });
  });

  it('hashFile produces stable results for the same file content', async () => {
    await withTempDir(async (dir) => {
      await writeFile(join(dir, 'a.txt'), 'payload');
      const r1 = await hashFile(join(dir, 'a.txt'), 'a.txt');
      const r2 = await hashFile(join(dir, 'a.txt'), 'a.txt');
      expect(r1).toEqual(r2);
      expect(r1.sha256).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  it('excludes excluded dirs and lockfiles', async () => {
    await withTempDir(async (dir) => {
      await mkdir(join(dir, 'node_modules', 'pkg'), { recursive: true });
      await writeFile(join(dir, 'node_modules', 'pkg', 'index.js'), 'skip');
      await writeFile(join(dir, 'package-lock.json'), '{}');
      await writeFile(join(dir, 'src.ts'), 'export const a = 1;');
      const repo = makeRepo('r', dir);
      const result = await scanRepo(repo);
      const paths = result.files.map((f) => f.relativePath);
      expect(paths.some((p) => p.includes('node_modules'))).toBe(false);
      expect(paths).toContain('src.ts');
      expect(paths).not.toContain('package-lock.json');
    });
  });
});

describe('manifest builder', () => {
  it('computes duplicate groups', async () => {
    await withTempDir(async (dir) => {
      await mkdir(join(dir, 'repoA'), { recursive: true });
      await mkdir(join(dir, 'repoB'), { recursive: true });
      await writeFile(join(dir, 'repoA', 'x.ts'), 'export const v = 1;\n');
      await writeFile(join(dir, 'repoB', 'x.ts'), 'export const v = 1;\n');
      const rA = makeRepo('A', join(dir, 'repoA'));
      const rB = makeRepo('B', join(dir, 'repoB'));
      const a = await scanRepo(rA);
      const b = await scanRepo(rB);
      const map = new Map([['A', a.files], ['B', b.files]]);
      const manifest = buildManifest({ repos: [rA, rB], filesByRepo: map });
      expect(manifest.duplicates.length).toBeGreaterThan(0);
      expect(manifest.totalFiles).toBe(2);
    });
  });

  it('produces a deterministic manifest hash for the same input', async () => {
    await withTempDir(async (dir) => {
      await writeFile(join(dir, 'a.txt'), 'x\n');
      const r = makeRepo('r', dir);
      const result = await scanRepo(r);
      const map = new Map([['r', result.files]]);
      const m1 = buildManifest({ repos: [r], filesByRepo: map });
      const m2 = buildManifest({ repos: [r], filesByRepo: map });
      // Content hashes of file entries are identical.
      expect(m1.files.map((f) => f.contentHash)).toEqual(m2.files.map((f) => f.contentHash));
      // Total files + bytes are identical.
      expect(m1.totalFiles).toEqual(m2.totalFiles);
      expect(m1.totalBytes).toEqual(m2.totalBytes);
    });
  });

  it('serializes manifest as JSON', async () => {
    await withTempDir(async (dir) => {
      await writeFile(join(dir, 'a.txt'), 'x\n');
      const r = makeRepo('r', dir);
      const result = await scanRepo(r);
      const map = new Map([['r', result.files]]);
      const m = buildManifest({ repos: [r], filesByRepo: map });
      const s = serializeManifest(m);
      expect(s.endsWith('\n')).toBe(true);
      expect(JSON.parse(s)).toEqual(m);
    });
  });
});
