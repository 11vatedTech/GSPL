/**
 * check-package-basics.mts -- Prompt 3 master directive §5.1.
 *
 * Two-tier required-list model:
 *   ALWAYS_REQUIRED_ROOT_SCRIPTS      -- must be present right now.
 *   COMPLETION_REQUIRED_ROOT_SCRIPTS  -- required only after the
 *                                          relevant subsystem lands;
 *                                          reported as informational
 *                                          until STRICT_COMPLETION=1.
 *
 * Reported defects:
 *   1. Root package.json fails JSON.parse.
 *   2. Root package.json is not strict RFC 3629 UTF-8 (mojibake).
 *   3. Root package.json description is non-string or empty.
 *   4. Root package.json workspaces is non-array or has duplicates.
 *   5. Root package.json is missing ANY ALWAYS_REQUIRED script.
 *   6. Root package.json is missing ANY COMPLETION_REQUIRED script
 *      AND STRICT_COMPLETION=1.
 *
 * Deterministic output: no timestamps, no absolute host paths, no
 * machine-specific paths. Uses cwd-based repo-root resolution with
 * import.meta.url fallback for relative invocation.
 */
import { readFileSync } from 'node:fs';
import { resolve, isAbsolute } from 'node:path';

const STRICT_COMPLETION = process.env['STRICT_COMPLETION'] === '1';

const ALWAYS_REQUIRED = Object.freeze([
  'build', 'test', 'typecheck',
  'test:text-source', 'test:lexer',
  'test:property', 'test:fuzz', 'test:mutation',
  'check:tracked-source', 'check:clean-source', 'check:roundtrip',
  'check:restart-reconstruction', 'check:packages',
  'check:determinism', 'check:conformance',
  'check:provenance', 'check:claims',
  'check:token-coverage', 'check:lexical-grammar',
  'check:package-boundaries', 'check:lexer-limit-coverage',
  'check:lexer-determinism', 'check:package-basics',
  'validate', 'validate:lexer',
]);

const COMPLETION_REQUIRED = Object.freeze([
  'test:parser', 'test:parser-property', 'test:parser-fuzz',
  'test:parser-mutation', 'test:frontend', 'test:formatter',
  'test:frontend-security', 'test:frontend-limits',
  'test:lexer-property', 'test:lexer-fuzz', 'test:lexer-mutation',
  'test:lexer-security', 'test:lexer-limits',
  'check:syntax-coverage', 'check:grammar-consistency',
  'check:diagnostic-coverage', 'check:frontend-limit-coverage',
  'check:frontend-determinism', 'check:frontend-conformance',
  'fixtures:lexer', 'fixtures:frontend',
  'validate:frontend',
]);

function resolveRepoRoot(): string {
  const cwd = process.cwd();
  if (isAbsolute(cwd)) {
    let cur: string = cwd;
    for (let i = 0; i < 32; i++) {
      try { readFileSync(resolve(cur, 'package.json')); return cur; }
      catch {
        const parent: string = resolve(cur, '..');
        if (parent === cur) break;
        cur = parent;
      }
    }
  }
  const here = new URL(import.meta.url);
  const localized = here.pathname.replace(/^\/([A-Za-z]:)/, '$1');
  return resolve(localized, '..', '..');
}

const REPO_ROOT: string = resolveRepoRoot();

interface PackageJsonShape {
  readonly workspaces?: readonly unknown[];
  readonly scripts?: Readonly<Record<string, string>>;
  readonly description?: unknown;
}

function loadJson(p: string): { ok: boolean; data?: unknown; reasons: string[] } {
  const reasons: string[] = [];
  let raw: Buffer;
  try { raw = readFileSync(p); }
  catch (e) { reasons.push(`cannot read ${p}: ${(e as Error).message}`); return { ok: false, reasons }; }
  let dec: string;
  try { dec = new TextDecoder('utf-8', { fatal: true }).decode(raw); }
  catch { reasons.push(`${p}: not strict UTF-8`); return { ok: false, reasons }; }
  if (!raw.equals(Buffer.from(dec, 'utf-8'))) {
    reasons.push(`${p}: non-canonical UTF-8 (mojibake)`);
    return { ok: false, reasons };
  }
  let data: unknown;
  try { data = JSON.parse(dec); }
  catch (e) { reasons.push(`${p}: JSON parse: ${(e as Error).message}`); return { ok: false, reasons }; }
  return { ok: true, data, reasons };
}

function asObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function checkRoot(pkg: unknown): string[] {
  const issues: string[] = [];
  if (!asObject(pkg)) { issues.push('root: top-level not an object'); return issues; }
  const o = pkg as PackageJsonShape & Record<string, unknown>;
  if (!asObject(o.scripts)) { issues.push('root.scripts missing or non-object'); return issues; }
  for (const required of ALWAYS_REQUIRED) {
    if (!(required in (o.scripts as Record<string, string>))) {
      issues.push(`root.scripts missing always-required entry: ${required}`);
    }
  }
  if (STRICT_COMPLETION) {
    for (const required of COMPLETION_REQUIRED) {
      if (!(required in (o.scripts as Record<string, string>))) {
        issues.push(`root.scripts missing completion-required entry: ${required}`);
      }
    }
  }
  if (!Array.isArray(o.workspaces)) {
    issues.push('root.workspaces missing or non-array');
    return issues;
  }
  const seen = new Set<string>();
  for (const w of o.workspaces) {
    if (typeof w !== 'string') { issues.push(`root.workspaces non-string pattern: ${String(w)}`); continue; }
    if (seen.has(w)) issues.push(`root.workspaces duplicate pattern: ${w}`);
    seen.add(w);
  }
  if (typeof o.description !== 'string' || (o.description as string).length === 0) {
    issues.push('root.description must be a non-empty UTF-8 string');
  }
  return issues;
}

const rootPath = resolve(REPO_ROOT, 'package.json');
const rootResult = loadJson(rootPath);
const issues: string[] = [];
if (!rootResult.ok) issues.push(...rootResult.reasons);
else issues.push(...checkRoot(rootResult.data));

const pendingCompletionCompletionGaps: string[] = [];
const realIssues: string[] = [];
for (const i of issues) {
  if (STRICT_COMPLETION) { realIssues.push(i); continue; }
  if (i.startsWith('pending-completion:')) pendingCompletionCompletionGaps.push(i);
  else realIssues.push(i);
}

if (realIssues.length > 0) {
  process.stderr.write('CHECK-PACKAGE-BASICS FAIL\n');
  for (const i of realIssues) process.stderr.write(`  - ${i}\n`);
  process.exit(1);
}
const pendingCount = COMPLETION_REQUIRED.length - ALWAYS_REQUIRED.length > 0
  ? COMPLETION_REQUIRED.filter((s) => !(s in ((rootResult.data as PackageJsonShape | undefined)?.scripts ?? {}))).length
  : 0;
process.stdout.write(`CHECK-PACKAGE-BASICS OK${pendingCount > 0 ? ` (${pendingCount} pending completion entries)` : ''}\n`);
process.exit(0);
