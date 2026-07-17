/**
 * check-package-boundaries.mts -- Prompt 3 master directive §5.4.
 *
 * Fails non-zero if any source/test/tool/script file inside the GSPL
 * workspace imports another workspace package through its INTERNAL
 * source tree, rather than its declared public package export.
 *
 *   Allowed:
 *     - import { ... } from '@gspl/<other>'          (public export)
 *     - import { ... } from './sibling.js'           (same pkg)
 *     - import { ... } from '../another.js'          (same pkg)
 *     - import { ... } from '../src/foo.js'          (same pkg)
 *
 *   Disallowed:
 *     - '../../<other>/src/...'                       (relative escape)
 *     - '../<other>/src/...'
 *     - './../<other>/src/...'
 *     - './packages/<other>/src/...'                  (NPM layout)
 *     - './tools/<other>/src/...'
 *     - 'packages/<other>/src/...'
 *
 * Path detection is platform-normalized: backslashes are converted to
 * forward slashes before matching, so Windows-style escape imports are
 * also caught.
 *
 * Deterministic output: violations are sorted before printing; no
 * timestamps, no absolute host paths.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const VALID_EXT = new Set(['.ts', '.mts', '.cts', '.tsx', '.js', '.cjs', '.mjs', '.jsx']);

function resolveRepoRoot(): string {
  const cwd = process.cwd();
  let cur: string = cwd;
  for (let i = 0; i < 32; i++) {
    try { readFileSync(resolve(cur, 'package.json')); return cur; }
    catch {
      const parent: string = resolve(cur, '..');
      if (parent === cur) break;
      cur = parent;
    }
  }
  const here = new URL(import.meta.url);
  const localized = here.pathname.replace(/^\/([A-Za-z]:)/, '$1');
  return resolve(localized, '..', '..');
}

const REPO_ROOT: string = resolveRepoRoot();

// One regex matching import/require/from() with optional binding.
const IMPORT_REGEX = /(?:import\s+(?:[^'"`;]+?\s+from\s+)?["']([^"']+)["'])|(?:require\(\s*["']([^"']+)["']\s*\))|(?:from\(\s*["']([^"']+)["']\s*\))/g;

const violations: string[] = [];

/** Platform-normalize: convert backslashes to forward slashes. */
function norm(spec: string): string {
  return spec.replace(/\\/g, '/');
}

/** Owning workspace package name for a file path, or null. */
function packageNameFor(file: string): string | null {
  const r = relative(REPO_ROOT, file);
  if (r.startsWith('..')) return null;
  const parts = r.split('/');
  if (parts.length < 2) return null;
  const top = parts[0];
  if (top !== 'packages' && top !== 'tools') return null;
  return parts[1] ?? null;
}

/** Strip leading ./ and ../ chains; return concrete path segments. */
function concreteSegments(s: string): string[] {
  let i = 0;
  while (i < s.length) {
    if (s.startsWith('./', i)) { i += 2; continue; }
    if (s.startsWith('../', i)) { i += 3; continue; }
    break;
  }
  return s.slice(i).split('/').filter((x) => x.length > 0 && x !== '.' && x !== '..');
}

/**
 * Identify the workspace package name a forbidden-style spec targets.
 * Returns the target package name, or null if the spec does not name
 * another workspace package, or names the importer's own package.
 */
function targetPackageInSpec(spec: string, myPkg: string | null): string | null {
  const segs = concreteSegments(norm(spec));
  if (segs.length === 0) return null;
  const first = segs[0];
  if (first === 'packages' || first === 'tools') {
    return segs[1] ?? null;
  }
  // Legacy relative escape: '../<other>/src/...' or './<other>/src/...'
  if (segs[1] === 'src') {
    return myPkg === first ? null : first;
  }
  return null;
}

/**
 * Detect a forbidden cross-package internal-src import.
 *
 * Required shape (one of):
 *   - segs[0] in {'packages','tools'} AND segs[2] === 'src' AND segs.length >= 4
 *       -> NPM-style import into another workspace package's src.
 *   - segs[1] === 'src' AND segs.length >= 3 AND segs[0] is a plain
 *     identifier (no '@' prefix, no '.').
 *       -> Legacy relative escape into another workspace package's src.
 */
function isForbiddenCrossPackageImport(spec: string): boolean {
  const s = norm(spec);
  const segs = concreteSegments(s);
  if (segs.length < 2) return false;

  if ((segs[0] === 'packages' || segs[0] === 'tools')
      && (segs[2] ?? '') === 'src'
      && segs.length >= 4) {
    return true;
  }
  if (segs[1] === 'src'
      && segs.length >= 3
      && !segs[0].startsWith('@')
      && !segs[0].includes('.')) {
    return true;
  }
  return false;
}

function scan(file: string, myPkg: string | null): void {
  let text: string;
  try { text = readFileSync(file, 'utf8'); } catch { return; }
  IMPORT_REGEX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = IMPORT_REGEX.exec(text)) !== null) {
    const spec = (m[1] ?? m[2] ?? m[3] ?? '').trim();
    if (spec.length === 0) continue;
    if (!isForbiddenCrossPackageImport(spec)) continue;
    const target = targetPackageInSpec(spec, myPkg);
    if (target === null || target === myPkg) continue;
    violations.push(`${relative(REPO_ROOT, file)} imports "${spec}" via another workspace package's internal src (target=${target})`);
  }
}

function shouldSkipDir(name: string): boolean {
  return name === 'node_modules' || name === 'dist' || name === 'coverage' ||
         name === '.git' || name === 'build' || name === 'fuzz-output' ||
         name === 'mutation-work' || name === 'corpus-output' ||
         name === 'examples';
}

function walk(root: string, myPkg: string | null): void {
  let entries: string[];
  try { entries = readdirSync(root); } catch { return; }
  for (const e of entries) {
    if (shouldSkipDir(e)) continue;
    const p = join(root, e);
    let s;
    try { s = statSync(p); }
    catch { continue; }
    if (s.isDirectory()) walk(p, packageNameFor(p));
    else if (s.isFile()) {
      const ext = p.slice(p.lastIndexOf('.'));
      if (VALID_EXT.has(ext)) scan(p, myPkg);
    }
  }
}

const ROOTS: ReadonlyArray<readonly [string, string]> = Object.freeze([
  ['packages', 'src'], ['packages', 'test'],
  ['tools', 'src'], ['tools', 'test'],
  ['scripts', ''],
]);

for (const [root, sub] of ROOTS) {
  const baseDir = resolve(REPO_ROOT, root);
  if (!statSync(baseDir, { throwIfNoEntry: false })) continue;
  if (sub === '') {
    let topLevel: string[];
    try { topLevel = readdirSync(baseDir); } catch { continue; }
    for (const e of topLevel) {
      if (shouldSkipDir(e)) continue;
      const p = join(baseDir, e);
      let s;
      try { s = statSync(p); } catch { continue; }
      if (s.isDirectory()) walk(p, null);
      else if (s.isFile() && VALID_EXT.has(p.slice(p.lastIndexOf('.')))) scan(p, null);
    }
  } else {
    let topLevel: string[];
    try { topLevel = readdirSync(baseDir); } catch { continue; }
    for (const e of topLevel) {
      const p = join(baseDir, e);
      let s;
      try { s = statSync(p); } catch { continue; }
      if (!s.isDirectory()) continue;
      walk(join(p, sub), e);
    }
  }
}

violations.sort();
if (violations.length > 0) {
  process.stderr.write('CHECK-PACKAGE-BOUNDARIES FAIL\n');
  for (const v of violations) process.stderr.write(`  - ${v}\n`);
  process.exit(1);
}
process.stdout.write('CHECK-PACKAGE-BOUNDARIES OK\n');
process.exit(0);
