/** verify.mts — independent inspector. Hand-parses USTAR headers,
 *  validates path safety & manifest. */
import { readFileSync, existsSync } from 'node:fs';
import { Buffer } from 'node:buffer';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve as pathResolve } from 'node:path';
import type { SourceArchiveManifest } from './manifest.mts';

const BLOCK = 512;
const NAME_MAX = 100;

// Prompt 2 §3: explicit decompression-bomb guards.
const MAX_TARGET_SIZE = 50 * 1024 * 1024; // 50MB uncompressed
const MAX_RATIO = 50;
const MIN_GZ_FOR_RATIO = 512;


const FORBIDDEN_NAMES = new Set<string>([
  'node_modules', 'dist', 'coverage', '.vite', '.git', 'build',
  '.nyc_output', '.cache', '.turbo',
]);
const FORBIDDEN_EXTS = new Set<string>(['.tsbuildinfo']);

interface HeaderInfo { readonly name: string; readonly size: number; readonly mode: number; readonly typeflag: string; }

function parseOct(buf: Buffer, off: number, len: number): number {
  const s = buf.subarray(off, off + len).toString('ascii').replace(/\u0000/g, '').trim();
  return parseInt(s, 8) || 0;
}

// Allowed USTAR typeflag values: '0' (regular file) and '5' (directory).
// All others (symlink='2', hardlink='1', char/block device, fifo, etc.) are rejected
// with GSPL-ARCHIVE-SYMLINK-ESCAPE — symlink-in-tar is the canonical symlink-escape attack.
const ALLOWED_TYPEFLAGS = new Set(['0', '5', '\u0000']); // '\u0000' = pre-POSIX regular file

function parseTarHeaders(tar: Buffer): { headers: HeaderInfo[]; errors: string[] } {
  const out: HeaderInfo[] = [];
  const errors: string[] = [];
  for (let off = 0; off + BLOCK <= tar.length; off += BLOCK) {
    const block = tar.subarray(off, off + BLOCK);
    if (block.every(b => b === 0)) break;
    const name = block.subarray(0, NAME_MAX).toString('utf8').replace(/\u0000/g, '');
    if (!name) { errors.push('Empty path at offset ' + off); continue; }
    const size = parseOct(block, 124, 11);
    const typeflag = String.fromCharCode(block[156] ?? 0x30);
    if (!ALLOWED_TYPEFLAGS.has(typeflag)) {
      errors.push('GSPL-ARCHIVE-SYMLINK-ESCAPE: entry ' + name + ' has typeflag=' + JSON.stringify(typeflag) + ' (only regular file and directory allowed)');
      continue;
    }
    out.push({ name: name, size, mode: parseOct(block, 100, 7), typeflag });
    // Skip content blocks: advance past Math.ceil(size/BLOCK)*BLOCK bytes of
    // file data so the next iteration reads the next header (not data zeros).
    if (size > 0) {
      off += Math.ceil(size / BLOCK) * BLOCK;
    }
  }
  return { headers: out, errors };
}

function pathIsSafe(name: string): { ok: boolean; reason?: string } {
  const BS = String.fromCharCode(92);
  if (name.startsWith('//') || name.startsWith(BS + BS)) return { ok: false, reason: 'UNC path' };
  if (/^[A-Za-z]:[\/]/.test(name)) return { ok: false, reason: 'drive-letter path' };
  if (name.startsWith('/') || name.startsWith(BS)) return { ok: false, reason: 'absolute path' };
  if (name.split('/').some(seg => seg === '..' || seg === '.')) return { ok: false, reason: 'traversal segment' };
  for (const forbidden of FORBIDDEN_NAMES) {
    if (name === forbidden || name.startsWith(forbidden + '/')) return { ok: false, reason: 'forbidden dir: ' + forbidden };
  }
  const lastSlash = name.lastIndexOf('/');
  const base = lastSlash < 0 ? name : name.slice(lastSlash + 1);
  for (const ext of FORBIDDEN_EXTS) {
    if (base.endsWith(ext)) return { ok: false, reason: 'forbidden ext: ' + ext };
  }
  return { ok: true };
}

export interface VerifyResult {
  readonly ok: boolean;
  readonly archiveBytesActual: string;
  readonly manifestHashExpected: string;
  readonly manifestHashActual: string;
  readonly entryCountTar: number;
  readonly entryCountManifest: number;
  readonly pathViolations: readonly { path: string; reason: string }[];
  readonly parseErrors: readonly string[];
  readonly missingArchive: boolean;
  readonly missingManifest: boolean;
  readonly manifestSchemaOk: boolean;
}

export function verifyArchiveTarGz(
  archivePath: string,
  manifestPath: string,
): VerifyResult {
  const missingArchive = !existsSync(archivePath);
  const missingManifest = !existsSync(manifestPath);
  if (missingArchive || missingManifest) {
    return {
      ok: false, archiveBytesActual: 'missing',
      manifestHashExpected: 'missing', manifestHashActual: 'missing',
      entryCountTar: 0, entryCountManifest: 0, pathViolations: [],
      parseErrors: [],
      missingArchive, missingManifest, manifestSchemaOk: false,
    };
  }
  const gz = readFileSync(archivePath);
  const archiveBytesActual = 'sha256:' + createHash('sha256').update(gz).digest('hex');
  let tar: Buffer; try { tar = gunzipSync(gz); }
  catch (err) {
    return { ok: false, archiveBytesActual, manifestHashExpected: 'gzip-failed', manifestHashActual: 'gzip-failed', entryCountTar: 0, entryCountManifest: 0, pathViolations: [], parseErrors: ['gzip decompression failed: ' + (err as Error).message], missingArchive: false, missingManifest: false, manifestSchemaOk: false };
  }
  // §3: parseTarHeaders must be called BEFORE the size/ratio checks because the
  // size/ratio checks push to `parseErrors` which is declared via destructuring here.
  const { headers, errors: parseErrors } = parseTarHeaders(tar);
  // §3: decompression-bomb guards (size + ratio) — AFTER parseTarHeaders so parseErrors is in scope
  if (tar.length > MAX_TARGET_SIZE) {
    parseErrors.push('GSPL-ARCHIVE-SIZE-LIMIT: uncompressed size ' + tar.length + ' exceeds ' + MAX_TARGET_SIZE);
  }
  if (gz.length > MIN_GZ_FOR_RATIO && tar.length / gz.length > MAX_RATIO) {
    parseErrors.push('GSPL-ARCHIVE-BOMBS: compression ratio ' + Math.round(tar.length / gz.length) + ' exceeds ' + MAX_RATIO);
  }
  const seenKey = new Set<string>();
  const seenLower = new Set<string>();
  const pathViolations: { path: string; reason: string }[] = [];
  for (const h of headers) {
    if (seenKey.has(h.name)) { pathViolations.push({ path: h.name, reason: 'duplicate path' }); continue; }
    seenKey.add(h.name);
    const lower = h.name.toLowerCase();
    if (seenLower.has(lower)) { pathViolations.push({ path: h.name, reason: 'case-collides with existing entry' }); continue; }
    seenLower.add(lower);
    const safe = pathIsSafe(h.name);
    if (!safe.ok) pathViolations.push({ path: h.name, reason: safe.reason ?? 'unsafe' });
  }
  let manifestSchemaOk = false;
  let manifestHashExpected = 'parse-failed';
  let entryCountManifest = 0;
  try {
    const mf = JSON.parse(readFileSync(manifestPath, 'utf8')) as Partial<SourceArchiveManifest> & { entries?: unknown[] };
    if (mf && mf.schema === 'gspl.source-archive-manifest' && mf.schemaVersion === '1.0' && Array.isArray(mf.entries) && typeof mf.manifestHash === 'string') {
      manifestSchemaOk = true;
      manifestHashExpected = mf.manifestHash;
      entryCountManifest = mf.entries.length;
    }
  } catch (err) { parseErrors.push('manifest parse failed: ' + (err as Error).message); }
  const tarHashActual = 'sha256:' + createHash('sha256').update(tar).digest('hex');
  const manifestHashActual = tarHashActual;
  const ok = parseErrors.length === 0 && pathViolations.length === 0 &&
    manifestSchemaOk && manifestHashActual === manifestHashExpected &&
    headers.length === entryCountManifest;
  return {
    ok, archiveBytesActual, manifestHashExpected, manifestHashActual,
    entryCountTar: headers.length, entryCountManifest,
    pathViolations, parseErrors,
    missingArchive: false, missingManifest: false,
    manifestSchemaOk,
  };
}

export function main(argv: readonly string[]): number {
  const archivePath = argv[2];
  const manifestPath = argv[3] ?? archivePath?.replace(/\u002Etar\u002Egz$/, '-manifest.json');
  if (!archivePath || !manifestPath) {
    console.error('[verify] missing required archive/manifest paths');
    return 2;
  }
  const r = verifyArchiveTarGz(archivePath, manifestPath);
  console.log('[verify] ok=' + r.ok + ' entries=' + r.entryCountTar + ' manifestEntries=' + r.entryCountManifest + ' manifestHashMatch=' + (r.manifestHashActual === r.manifestHashExpected));
  if (!r.ok) {
    console.error('[verify] errors=' + JSON.stringify(r));
    return 1;
  }
  return 0;
}

const __filename = fileURLToPath(import.meta.url);
const __invokedAs = process.argv[1] ? pathResolve(process.argv[1]) : '';
if (__invokedAs === __filename) {
  process.exit(main(process.argv));
}
