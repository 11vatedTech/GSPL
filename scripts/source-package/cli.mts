/** cli.mts — orchestrator. collect -> archive -> manifest -> write outputs.
 *  Pure Node. Only child_process.execFileSync for git SHA read. */
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { archivePaths } from './policy.mts';
import { collectEntries } from './collect.mts';
import { packTar, gzipTar } from './archive.mts';
import { buildManifest, serializeManifest } from './manifest.mts';

function commitShort(projectRoot: string): string {
  try { return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: projectRoot, encoding: 'utf8' }).trim(); }
  catch { return 'no-commit'; }
}

function pkgVersion(projectRoot: string): string {
  try { const j = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as { version?: string }; return typeof j.version === 'string' ? j.version : '0.0.0'; }
  catch { return '0.0.0'; }
}

export interface CliRunResult {
  readonly entryCount: number;
  readonly totalBytes: number;
  readonly tarHash: string;
  readonly archiveHash: string;
  readonly manifestHash: string;
}

export function run(projectRoot: string): CliRunResult {
  const paths = archivePaths(projectRoot);
  mkdirSync(paths.outputDir, { recursive: true });
  const entries = collectEntries(projectRoot);
  const tar = packTar(entries);
  const tarHash = 'sha256:' + createHash('sha256').update(tar).digest('hex');
  const archiveBuf = gzipTar(tar);
  const archiveHash = 'sha256:' + createHash('sha256').update(archiveBuf).digest('hex');
  const repositoryVersion = pkgVersion(projectRoot);
  const sourceCommit = commitShort(projectRoot);
  const manifest = buildManifest(entries, tarHash, repositoryVersion, sourceCommit);
  const manifestBuf = serializeManifest(manifest);
  const manifestHash = 'sha256:' + createHash('sha256').update(manifestBuf).digest('hex');
  writeFileSync(paths.archivePath, archiveBuf);
  writeFileSync(paths.archiveSha256Path, Buffer.from(archiveHash + '\n', 'ascii'));
  writeFileSync(paths.manifestPath, manifestBuf);
  writeFileSync(paths.manifestSha256Path, Buffer.from(manifestHash + '\n', 'ascii'));
  const totalBytes = entries.reduce(function (s, e) { return s + e.size; }, 0);
  return {
    entryCount: entries.length,
    totalBytes: totalBytes,
    tarHash: tarHash,
    archiveHash: archiveHash,
    manifestHash: manifestHash,
  };
}

export function main(argv: readonly string[]): number {
  const projectRoot = resolve(argv[2] ?? '.');
  try {
    const r = run(projectRoot);
    console.log('[package] written ' + r.entryCount + ' entries (' + r.totalBytes + ' bytes)');
    console.log('[package] archive  ' + r.archiveHash);
    console.log('[package] manifest ' + r.manifestHash);
    return 0;
  } catch (err) {
    console.error('[package] failed: ' + (err as Error).message);
    return 1;
  }
}

import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __invokedAs = process.argv[1] ? resolve(process.argv[1]) : '';
if (__invokedAs === __filename) {
  process.exit(main(process.argv));
}
