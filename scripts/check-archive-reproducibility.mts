/**
 * check-archive-reproducibility.mts — generate the source archive twice in
 * independent local directories and prove byte equality (Prompt 2 §5).
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { stableStringify } from './lib/canonical-stringify.mts';

const ROOT = resolve('.');
const RUN_A = join(ROOT, 'build', 'repro-a');
const RUN_B = join(ROOT, 'build', 'repro-b');

function runPack(outDir: string) {
  const env = { ...process.env, GSPL_SOURCE_OUTPUT: outDir };
  const r = spawnSync(
    process.execPath,
    ['--experimental-strip-types', 'scripts/source-package/cli.mts', '.'],
    { cwd: ROOT, env, encoding: 'utf8' },
  );
  return {
    archivePath: join(outDir, 'gspl-canon-source.tar.gz'),
    manifestPath: join(outDir, 'gspl-canon-source-manifest.json'),
    ok: r.status === 0,
    stdout: r.stdout,
    stderr: r.stderr,
  };
}

mkdirSync(RUN_A, { recursive: true });
mkdirSync(RUN_B, { recursive: true });
const a = runPack(RUN_A);
const b = runPack(RUN_B);
if (!a.ok || !b.ok) {
  console.error('package:source failed');
  console.error('A:', a.stderr);
  console.error('B:', b.stderr);
  process.exit(1);
}

const archiveA = readFileSync(a.archivePath);
const archiveB = readFileSync(b.archivePath);
const archiveHashA = 'sha256:' + createHash('sha256').update(archiveA).digest('hex');
const archiveHashB = 'sha256:' + createHash('sha256').update(archiveB).digest('hex');
const manifestA = readFileSync(a.manifestPath, 'utf8');
const manifestB = readFileSync(b.manifestPath, 'utf8');

const bytesEqual = Buffer.compare(archiveA, archiveB) === 0;
const manifestBytesEqual = manifestA === manifestB;
const archiveHashEqual = archiveHashA === archiveHashB;
const ok = bytesEqual && archiveHashEqual && manifestBytesEqual;

const out = {
  schema: 'gspl.archive-reproducibility-report',
  schemaVersion: '1.0',
  runA: { path: a.archivePath, sizeBytes: archiveA.length, sha256: archiveHashA },
  runB: { path: b.archivePath, sizeBytes: archiveB.length, sha256: archiveHashB },
  archiveBytesEqual: bytesEqual,
  archiveHashEqual,
  manifestBytesEqual,
  ok,
};
process.stdout.write(stableStringify(out) + '\n');
if (!ok) process.exit(1);
