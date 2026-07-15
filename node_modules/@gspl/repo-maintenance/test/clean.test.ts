import { describe, it, expect } from 'vitest';
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rmSync, existsSync } from 'node:fs';
import { clean } from '../src/clean.js';

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'gspl-clean-test-'));
  try { return await fn(dir); }
  finally { try { rmSync(dir, { recursive: true, force: true }); } catch {} }
}

describe('clean', () => {
  it('dry-run reports deletions without actually removing', async () => {
    await withTempDir(async (dir) => {
      await mkdir(join(dir, 'dist'), { recursive: true });
      await writeFile(join(dir, 'dist', 'x.js'), 'x');
      const result = clean({ repoRoot: dir, dryRun: true });
      expect(result.deleted.length).toBeGreaterThan(0);
      expect(result.deleted.every((d) => d.startsWith('[dry-run]'))).toBe(true);
      expect(existsSync(join(dir, 'dist'))).toBe(true);
    });
  });

  it('actually deletes known generated dirs', async () => {
    await withTempDir(async (dir) => {
      await mkdir(join(dir, 'dist'), { recursive: true });
      await writeFile(join(dir, 'dist', 'x.js'), 'x');
      const result = clean({ repoRoot: dir, dryRun: false });
      expect(result.deleted.length).toBeGreaterThan(0);
      expect(existsSync(join(dir, 'dist'))).toBe(false);
    });
  });

  it('refuses paths outside repo root', async () => {
    await withTempDir(async (dir) => {
      await mkdir(join(dir, 'child'), { recursive: true });
      const result = clean({ repoRoot: join(dir, 'child'), dryRun: false });
      expect(result.deleted.length).toBe(0);
    });
  });

  it('skips known generated dirs during walk', async () => {
    await withTempDir(async (dir) => {
      await mkdir(join(dir, 'packages', 'foo', 'node_modules', 'bar'), { recursive: true });
      await writeFile(join(dir, 'packages', 'foo', 'node_modules', 'bar', 'index.js'), 'x');
      const result = clean({ repoRoot: dir, dryRun: false });
      expect(result.deleted.map((d) => d.replace(dir, ''))).not.toContain(
        expect.stringContaining('node_modules')
      );
    });
  });

  it('deletes tsbuildinfo files in subdirs', async () => {
    await withTempDir(async (dir) => {
      await mkdir(join(dir, 'packages', 'foo'), { recursive: true });
      await writeFile(join(dir, 'packages', 'foo', 'tsconfig.tsbuildinfo'), '');
      const result = clean({ repoRoot: dir, dryRun: false });
      expect(result.deleted.some((d) => d.includes('tsbuildinfo'))).toBe(true);
    });
  });

  it('does not delete source files', async () => {
    await withTempDir(async (dir) => {
      await writeFile(join(dir, 'src.ts'), 'export const a = 1;');
      const result = clean({ repoRoot: dir, dryRun: false });
      expect(existsSync(join(dir, 'src.ts'))).toBe(true);
    });
  });
});
