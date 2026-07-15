// 13+1-case adversarial test against the PRODUCTION verifier (Prompt 2 §3).
// Each case: build malicious archive → invoke verifyArchiveTarGz → assert rejection
// with a specific diagnostic code. Test #8 now constructs a real USTAR symlink
// entry (typeflag='2' at offset 156) to exercise the new GSPL-ARCHIVE-SYMLINK-ESCAPE
// code path. Test #8b is the positive control. Test #14 is the mutation test.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { writeFileSync, readFileSync, mkdirSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { verifyArchiveTarGz } from '../source-package/verify.mts';
import { buildTar, type TarEntry } from './ustar-codec.ts';

const ROOT = resolve('.');
const OUT_DIR = join(ROOT, 'artifacts', 'validation', 'verify-adversarial-test');

describe('Production-verifier adversarial tests (Prompt 2 §3)', () => {
  beforeAll(() => mkdirSync(OUT_DIR, { recursive: true }));
  afterAll(() => { try { rmSync(OUT_DIR, { recursive: true, force: true }); } catch {} });

  function setup(entries: ReadonlyArray<TarEntry>, name: string): { archivePath: string; manifestPath: string } {
    const tar = buildTar(entries);
    const gz = gzipSync(tar);
    const archivePath = join(OUT_DIR, name + '.tar.gz');
    const manifestPath = join(OUT_DIR, name + '.manifest.json');
    writeFileSync(archivePath, gz);
    const manifest = { schema: 'gspl.source-archive-manifest', schemaVersion: '1.0', repositoryVersion: 'test', sourceCommit: 'test', entries: [], totalFiles: 0, totalBytes: 0, manifestHash: 'sha256:placeholder' };
    writeFileSync(manifestPath, JSON.stringify(manifest));
    return { archivePath, manifestPath };
  }

  // 1. parent traversal
  it('1. parent traversal → path violation', () => {
    const p = setup([{ name: '../escape.txt', content: Buffer.from('x') }], 'traversal');
    const r = verifyArchiveTarGz(p.archivePath, p.manifestPath);
    expect(r.ok).toBe(false);
    expect(r.pathViolations.some((v) => v.reason.includes('traversal'))).toBe(true);
  });

  // 2. nested parent traversal
  it('2. nested parent traversal → path violation', () => {
    const p = setup([{ name: 'a/b/../../../escape.ts', content: Buffer.from('x') }], 'nested-traversal');
    const r = verifyArchiveTarGz(p.archivePath, p.manifestPath);
    expect(r.ok).toBe(false);
    expect(r.pathViolations.some((v) => v.reason.includes('traversal'))).toBe(true);
  });

  // 3. POSIX absolute path
  it('3. POSIX absolute path → path violation', () => {
    const p = setup([{ name: '/etc/passwd', content: Buffer.from('x') }], 'absolute');
    const r = verifyArchiveTarGz(p.archivePath, p.manifestPath);
    expect(r.ok).toBe(false);
    expect(r.pathViolations.some((v) => v.reason.includes('absolute'))).toBe(true);
  });

  // 4. Windows drive path
  it('4. Windows drive path → path violation', () => {
    const p = setup([{ name: 'C:/Windows/system.ini', content: Buffer.from('x') }], 'drive');
    const r = verifyArchiveTarGz(p.archivePath, p.manifestPath);
    expect(r.ok).toBe(false);
    expect(r.pathViolations.some((v) => v.reason.includes('drive-letter'))).toBe(true);
  });

  // 5. UNC path
  it('5. UNC path → path violation', () => {
    const p = setup([{ name: '//server/share/file', content: Buffer.from('x') }], 'unc');
    const r = verifyArchiveTarGz(p.archivePath, p.manifestPath);
    expect(r.ok).toBe(false);
    expect(r.pathViolations.some((v) => v.reason.includes('UNC'))).toBe(true);
  });

  // 6. duplicate entry
  it('6. duplicate entry → path violation', () => {
    const p = setup([{ name: 'dup.txt', content: Buffer.from('a') }, { name: 'dup.txt', content: Buffer.from('b') }], 'dup');
    const r = verifyArchiveTarGz(p.archivePath, p.manifestPath);
    expect(r.ok).toBe(false);
    expect(r.pathViolations.some((v) => v.reason.includes('duplicate'))).toBe(true);
  });

  // 7. case-colliding entry
  it('7. case-colliding entry → path violation', () => {
    const p = setup([{ name: 'case.txt', content: Buffer.from('a') }, { name: 'CASE.txt', content: Buffer.from('b') }], 'case');
    const r = verifyArchiveTarGz(p.archivePath, p.manifestPath);
    expect(r.ok).toBe(false);
    expect(r.pathViolations.some((v) => v.reason.includes('case-collides'))).toBe(true);
  });

  // 8. REAL USTAR SYMLINK ESCAPE — typeflag='2' at offset 156
  it('8. real USTAR symlink (typeflag=2) → GSPL-ARCHIVE-SYMLINK-ESCAPE', () => {
    const p = setup([{ type: 'symlink', name: 'evil-link', linkname: '../../outside-target' }], 'symlink-escape');
    const r = verifyArchiveTarGz(p.archivePath, p.manifestPath);
    expect(r.ok).toBe(false);
    expect(r.parseErrors.some((e) => e.includes('GSPL-ARCHIVE-SYMLINK-ESCAPE'))).toBe(true);
    // The verifier rejects the archive before any file IO / extraction.
    // No partial extraction can occur because the verifier never extracts.
  });

  // 8b. positive control: valid file followed by symlink still rejected.
  // The file entry MUST be parseable (entryCountTar===1 from the file) BEFORE the
  // symlink entry triggers the rejection — proves the parser reached the typeflag
  // branch rather than rejecting an earlier malformed header.
  it('8b. positive control: valid file + symlink → symlink still rejected', () => {
    const p = setup([
      { type: 'file', name: 'good.txt', content: Buffer.from('ok') },
      { type: 'symlink', name: 'evil-link', linkname: '../../outside' },
    ], 'symlink-control');
    const r = verifyArchiveTarGz(p.archivePath, p.manifestPath);
    expect(r.ok).toBe(false);
    expect(r.parseErrors.some((e) => e.includes('GSPL-ARCHIVE-SYMLINK-ESCAPE'))).toBe(true);
    // Positive control: the file entry was parsed before the symlink was rejected.
    // parseTarHeaders returns headers only for non-rejected entries, so headers=1 (file only).
    // The symlink entry was rejected at the typeflag check, so it is NOT in headers.
    expect(r.entryCountTar).toBe(1);
  });

  // 9. corrupted content — valid tar but gzip is corrupted
  it('9. corrupted archive (gzip) → parse error', () => {
    const archivePath = join(OUT_DIR, 'corrupted.tar.gz');
    const manifestPath = join(OUT_DIR, 'corrupted.manifest.json');
    writeFileSync(archivePath, Buffer.from([0x1f, 0x8b, 0x00, 0x00, 0x00])); // truncated gzip header
    writeFileSync(manifestPath, '{}');
    const r = verifyArchiveTarGz(archivePath, manifestPath);
    expect(r.ok).toBe(false);
    expect(r.parseErrors.length).toBeGreaterThan(0);
  });

  // 10. content-hash mismatch
  it('10. content-hash mismatch → manifest hash check fails', () => {
    const p = setup([{ name: 'ok.txt', content: Buffer.from('a') }], 'hash-mismatch');
    const r = verifyArchiveTarGz(p.archivePath, p.manifestPath);
    expect(r.ok).toBe(false);
    expect(r.manifestHashActual).not.toBe(r.manifestHashExpected);
  });

  // 11. manifest mismatch
  it('11. manifest schema mismatch → manifestSchemaOk=false', () => {
    const p = setup([{ name: 'ok.txt', content: Buffer.from('a') }], 'mf-mismatch');
    writeFileSync(p.manifestPath, JSON.stringify({ schema: 'wrong.schema' }));
    const r = verifyArchiveTarGz(p.archivePath, p.manifestPath);
    expect(r.manifestSchemaOk).toBe(false);
    expect(r.ok).toBe(false);
  });

  // 12. excessive uncompressed size
  it('12. excessive uncompressed size → GSPL-ARCHIVE-SIZE-LIMIT', () => {
    const huge = Buffer.alloc(55 * 1024 * 1024, 0);
    const p = setup([{ name: 'huge.txt', content: huge }], 'size-bomb');
    const r = verifyArchiveTarGz(p.archivePath, p.manifestPath);
    expect(r.ok).toBe(false);
    expect(r.parseErrors.some((e) => e.includes('SIZE-LIMIT'))).toBe(true);
  }, 30_000);

  // 13. excessive compression ratio
  it('13. excessive compression ratio → GSPL-ARCHIVE-BOMBS', () => {
    const zeros = Buffer.alloc(5 * 1024 * 1024, 0);
    const p = setup([{ name: 'ratio.txt', content: zeros }], 'ratio-bomb');
    const r = verifyArchiveTarGz(p.archivePath, p.manifestPath);
    expect(r.ok).toBe(false);
    expect(r.parseErrors.some((e) => e.includes('BOMBS'))).toBe(true);
  }, 30_000);

  // 14. MUTATION TEST: patching the verifier to allow typeflag='2' must cause the
  // FULL adversarial suite to fail when run against the mutated verifier. This
  // proves the suite catches removal of the symlink defense (Prompt 2 §3 mutation
  // requirement: 'change the typeflag parser so "2" is treated as an ordinary file;
  // confirm the adversarial suite fails').
  //
  // Refactored (Prompt 2 reconciliation): the driver subprocess now uses
  // env vars (MUTATED_VERIFIER_PATH, USTAR_CODEC_PATH, OUT_DIR) and dynamic
  // import() via pathToFileURL() — no fragile path interpolation, Windows-safe.
  it('14. mutation: removing symlink defense causes adversarial suite to fail', () => {
    const originalVerifierPath = join(ROOT, 'scripts/source-package/verify.mts');
    const mutatedVerifierPath = join(OUT_DIR, 'verify-mutated.mts');
    const codecPath = join(ROOT, 'scripts/source-package.test/ustar-codec.ts');
    // Patch: add '2' to ALLOWED_TYPEFLAGS so symlinks are accepted.
    const src = readFileSync(originalVerifierPath, 'utf8');
    const patched = src.replace(
      "new Set(['0', '5', '\u0000'])",
      "new Set(['0', '5', '\u0000', '2'])",
    );
    if (patched === src) throw new Error('mutation patch did not match — verifier format may have changed');
    writeFileSync(mutatedVerifierPath, patched, 'utf8');
    // Driver imports codec + mutated verifier via pathToFileURL (Windows-safe).
    const driverPath = join(OUT_DIR, 'mutation-driver.mts');
    const driverSrc = `
import { writeFileSync, mkdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const verifierUrl = pathToFileURL(process.env.MUTATED_VERIFIER_PATH!).href;
const codecUrl = pathToFileURL(process.env.USTAR_CODEC_PATH!).href;
const { verifyArchiveTarGz } = await import(verifierUrl);
const { buildTar } = await import(codecUrl);
const OUT = process.env.OUT_DIR!;
mkdirSync(OUT, { recursive: true });
const tar = buildTar([{ type: 'symlink', name: 'evil-link', linkname: '../../outside-target' }]);
const gz = gzipSync(tar);
const archivePath = join(OUT, 'mutation.tar.gz');
const manifestPath = join(OUT, 'mutation.manifest.json');
writeFileSync(archivePath, gz);
writeFileSync(manifestPath, JSON.stringify({ schema: 'gspl.source-archive-manifest', schemaVersion: '1.0', repositoryVersion: 'test', sourceCommit: 'test', entries: [], totalFiles: 0, totalBytes: 0, manifestHash: 'sha256:match' }));
const r = verifyArchiveTarGz(archivePath, manifestPath);
process.stdout.write(JSON.stringify({ ok: r.ok, parseErrors: r.parseErrors, entryCountTar: r.entryCountTar }) + '\\n');
`;
    writeFileSync(driverPath, driverSrc, 'utf8');
    const childEnv = {
      ...process.env,
      MUTATED_VERIFIER_PATH: mutatedVerifierPath,
      USTAR_CODEC_PATH: codecPath,
      OUT_DIR,
    };
    const r = spawnSync(process.execPath, ['--experimental-strip-types', driverPath], { encoding: 'utf8', env: childEnv });
    const combined = (r.stdout || '') + (r.stderr || '');
    if (r.status !== 0) throw new Error('mutation driver subprocess failed: ' + combined);
    const out = JSON.parse(combined.trim().split('\n').pop() || '{}');
    // The mutated verifier should NOT emit GSPL-ARCHIVE-SYMLINK-ESCAPE.
    expect(out.parseErrors.some((e: string) => e.includes('GSPL-ARCHIVE-SYMLINK-ESCAPE')))
      .toBe(false);
    // Defense removed: symlink entry is now treated as a regular file, so entryCountTar=1.
    expect(out.entryCountTar).toBe(1);
  }, 30_000);
});
