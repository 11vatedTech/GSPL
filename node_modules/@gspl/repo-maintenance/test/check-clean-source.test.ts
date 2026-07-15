import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkCleanSource } from '../src/check-clean-source.js';

const TMP_ROOT = join(process.cwd(), 'test', '__tmp_clean_source_test__');

function setupTmp() {
  rmSync(TMP_ROOT, { recursive: true, force: true });
  mkdirSync(TMP_ROOT, { recursive: true });
  writeFileSync(join(TMP_ROOT, 'package.json'), JSON.stringify({ name: 'tmp', private: true }));
  mkdirSync(join(TMP_ROOT, 'canon', 'provenance'), { recursive: true });
  mkdirSync(join(TMP_ROOT, 'docs', 'audit'), { recursive: true });
  mkdirSync(join(TMP_ROOT, 'reference-manifest'), { recursive: true });
  writeFileSync(join(TMP_ROOT, 'canon/provenance/inventions.json'), '[]');
  writeFileSync(join(TMP_ROOT, 'canon/provenance/sources.json'), '[]');
  writeFileSync(join(TMP_ROOT, 'canon/provenance/claims.json'), '[]');
  writeFileSync(join(TMP_ROOT, 'reference-manifest/source-manifest.json'), '{}');
  writeFileSync(join(TMP_ROOT, 'reference-manifest/repos.config.json'), '{}');
  writeFileSync(join(TMP_ROOT, 'docs/audit/architecture-decisions.json'), '[]');
}

function teardownTmp() {
  rmSync(TMP_ROOT, { recursive: true, force: true });
}

function mkdir(...segments: string[]): string {
  const p = join(TMP_ROOT, ...segments);
  mkdirSync(p, { recursive: true });
  return p;
}

function touchFile(...segments: string[]): string {
  const p = join(TMP_ROOT, ...segments);
  const parent = p.substring(0, p.lastIndexOf('/') > -1 ? p.lastIndexOf('/') : p.lastIndexOf(String.fromCharCode(92)));
  mkdirSync(parent, { recursive: true });
  writeFileSync(p, 'x');
  return p;
}

describe('checkCleanSource', () => {
  beforeEach(() => setupTmp());
  afterEach(() => teardownTmp());

  it('passes on a clean tree', () => {
    const result = checkCleanSource(TMP_ROOT);
    expect(result.ok).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('detects /node_modules at root', () => {
    mkdir('node_modules');
    const result = checkCleanSource(TMP_ROOT);
    expect(result.ok).toBe(false);
    expect(result.issues.some(function(i) { return i.includes('node_modules'); })).toBe(true);
  });

  it('detects /packages/example/node_modules', () => {
    mkdir('packages', 'example', 'node_modules');
    const result = checkCleanSource(TMP_ROOT);
    expect(result.ok).toBe(false);
    expect(result.issues.some(function(i) { return i.includes('packages/example/node_modules'); })).toBe(true);
  });

  it('detects /tools/example/node_modules', () => {
    mkdir('tools', 'example', 'node_modules');
    const result = checkCleanSource(TMP_ROOT);
    expect(result.ok).toBe(false);
    expect(result.issues.some(function(i) { return i.includes('tools/example/node_modules'); })).toBe(true);
  });

  it('detects /nested/workspace/dist', () => {
    mkdir('nested', 'workspace', 'dist');
    const result = checkCleanSource(TMP_ROOT);
    expect(result.ok).toBe(false);
    expect(result.issues.some(function(i) { return i.includes('nested/workspace/dist'); })).toBe(true);
  });

  it('detects dist at root', () => {
    mkdir('dist');
    const result = checkCleanSource(TMP_ROOT);
    expect(result.ok).toBe(false);
    expect(result.issues.some(function(i) { return i.includes('dist'); })).toBe(true);
  });

  it('detects coverage at any level', () => {
    mkdir('packages', 'foo', 'coverage');
    const result = checkCleanSource(TMP_ROOT);
    expect(result.ok).toBe(false);
    expect(result.issues.some(function(i) { return i.includes('coverage'); })).toBe(true);
  });

  it('detects .vite in nested workspace', () => {
    mkdir('packages', 'bar', '.vite');
    const result = checkCleanSource(TMP_ROOT);
    expect(result.ok).toBe(false);
    expect(result.issues.some(function(i) { return i.includes('.vite'); })).toBe(true);
  });

  it('detects .next directory', () => {
    mkdir('apps', 'web', '.next');
    const result = checkCleanSource(TMP_ROOT);
    expect(result.ok).toBe(false);
    expect(result.issues.some(function(i) { return i.includes('.next'); })).toBe(true);
  });

  it('detects .nuxt directory', () => {
    mkdir('.nuxt');
    const result = checkCleanSource(TMP_ROOT);
    expect(result.ok).toBe(false);
    expect(result.issues.some(function(i) { return i.includes('.nuxt'); })).toBe(true);
  });

  it('detects .turbo directory', () => {
    mkdir('.turbo');
    const result = checkCleanSource(TMP_ROOT);
    expect(result.ok).toBe(false);
    expect(result.issues.some(function(i) { return i.includes('.turbo'); })).toBe(true);
  });

  it('detects out directory', () => {
    mkdir('out');
    const result = checkCleanSource(TMP_ROOT);
    expect(result.ok).toBe(false);
    expect(result.issues.some(function(i) { return i.includes('out'); })).toBe(true);
  });

  it('detects stale .tsbuildinfo files', () => {
    touchFile('src', 'foo.tsbuildinfo');
    const result = checkCleanSource(TMP_ROOT);
    expect(result.ok).toBe(false);
    expect(result.issues.some(function(i) { return i.includes('.tsbuildinfo'); })).toBe(true);
  });

  it('detects tmp-extract directories', () => {
    mkdir('tmp-extract-001');
    const result = checkCleanSource(TMP_ROOT);
    expect(result.ok).toBe(false);
    expect(result.issues.some(function(i) { return i.includes('tmp-extract'); })).toBe(true);
  });

  it('detects temp- prefixed directories', () => {
    mkdir('temp-extraction');
    const result = checkCleanSource(TMP_ROOT);
    expect(result.ok).toBe(false);
    expect(result.issues.some(function(i) { return i.includes('temp-extraction'); })).toBe(true);
  });

  it('detects .test-cache directories', () => {
    mkdir('.test-cache-v1');
    const result = checkCleanSource(TMP_ROOT);
    expect(result.ok).toBe(false);
    expect(result.issues.some(function(i) { return i.includes('.test-cache'); })).toBe(true);
  });

  it('permits node_modules inside test fixtures', () => {
    mkdir('test', 'fixtures', 'node_modules');
    const result = checkCleanSource(TMP_ROOT);
    expect(result.ok).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('permits dist inside __fixtures__', () => {
    mkdir('__fixtures__', 'sample', 'dist');
    const result = checkCleanSource(TMP_ROOT);
    expect(result.ok).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('reports multiple issues in one run', () => {
    mkdir('node_modules');
    mkdir('dist');
    mkdir('packages', 'foo', 'node_modules');
    const result = checkCleanSource(TMP_ROOT);
    expect(result.ok).toBe(false);
    expect(result.issues.length).toBeGreaterThanOrEqual(3);
  });
});
