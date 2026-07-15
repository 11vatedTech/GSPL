import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, relative, basename } from 'node:path';

export interface CleanSourceResult { ok: boolean; issues: string[]; }

const CANONICAL_FILES = [
  'canon/provenance/inventions.json',
  'canon/provenance/sources.json',
  'canon/provenance/claims.json',
  'reference-manifest/source-manifest.json',
  'reference-manifest/repos.config.json',
  'docs/audit/architecture-decisions.json',
];

const BS = String.fromCharCode(92);
const ABSOLUTE_PATTERNS = [
  'C:' + BS, 'D:' + BS, 'E:' + BS, 'F:' + BS,
  '/c/', '/d/', '/e/', '/f/',
  '/home/', '/Users/', '/tmp/', '/etc/', '/var/', '/opt/', '/root/',
  BS + BS,
  '/c' + BS,
];

/**
 * Directories that MUST NOT exist anywhere in the repo
 * outside of explicitly permitted immutable test fixtures.
 */
const FORBIDDEN_DIRS = new Set([
  'node_modules',
  'dist',
  'coverage',
  '.vite',
  '.next',
  '.nuxt',
  '.turbo',
  'out',
]);

/** Patterns that indicate temporary/generated directories. */
const TEMP_DIR_PATTERNS = [
  /^tmp-extract/i,
  /^temp-/i,
  /^\.test-cache/i,
  /^__tests_output__/i,
];

/** Generated dependency folders that may appear nested. */
const GENERATED_DEP_PATTERNS = [
  /^\.pnpm$/,
];

/**
 * Directories that the walker should NOT descend into
 * (performance optimization — these are huge and contain no
 * user-authored content we need to scan).
 */
const SKIP_WALK_DIRS = new Set([
  'node_modules',
  '.git',
  '__pycache__',
  '.pytest_cache',
  '.idea',
  '.vscode',
]);

function isForbiddenDir(name: string): boolean {
  if (FORBIDDEN_DIRS.has(name)) return true;
  for (const pat of TEMP_DIR_PATTERNS) {
    if (pat.test(name)) return true;
  }
  for (const pat of GENERATED_DEP_PATTERNS) {
    if (pat.test(name)) return true;
  }
  return false;
}

/**
 * Check if a path is within an explicitly permitted immutable test fixture.
 *
 * Test fixtures are directories under `test/` or `__fixtures__/` that
 * intentionally contain sample artifacts (e.g., a fake `node_modules` or
 * `dist` for testing the checker itself).
 */
function isPermittedFixture(root: string, fullPath: string): boolean {
  const rel = relative(root, fullPath).replaceAll('\\', '/');
  const segments = rel.split('/');
  for (const seg of segments) {
    if (seg === 'test' || seg === '__tests__' || seg === '__fixtures__' || seg === 'fixtures') {
      return true;
    }
  }
  return false;
}

export function checkCleanSource(repoRoot: string): CleanSourceResult {
  const issues: string[] = [];
  const root = resolve(repoRoot);

  // Check canonical files for absolute paths.
  for (const rel of CANONICAL_FILES) {
    const target = join(root, rel);
    if (!existsSync(target)) continue;
    try {
      const content = readFileSync(target, 'utf-8');
      for (const pattern of ABSOLUTE_PATTERNS) {
        if (content.includes(pattern)) {
          issues.push('Absolute path in ' + rel + ': ' + pattern);
        }
      }
    } catch { issues.push('Unreadable: ' + rel); }
  }

  /**
   * Recursively walk the entire repository tree.
   * For each directory entry:
   *   - If it's a forbidden dir (node_modules, dist, etc.) → flag it (unless in a fixture)
   *   - If it's a skip dir (node_modules, .git, etc.) → don't descend
   *   - If it's a .tsbuildinfo file → flag it
   *   - Otherwise → descend into subdirectories
   */
  function walk(dir: string, depth: number) {
    if (depth > 15) return;
    let entries: string[];
    try { entries = readdirSync(dir); } catch { return; }

    for (const entry of entries) {
      const full = join(dir, entry);
      let st;
      try { st = statSync(full); } catch { continue; }

      if (st.isDirectory()) {
        // Check if this directory is forbidden.
        if (isForbiddenDir(entry)) {
          if (!isPermittedFixture(root, full)) {
            issues.push(
              'Forbidden directory: ' + relative(root, full).replaceAll('\\', '/')
            );
          }
          // Don't descend into forbidden dirs (they're generated).
          continue;
        }
        // Check for temp/generated patterns in the name.
        let flagged = false;
        for (const pat of TEMP_DIR_PATTERNS) {
          if (pat.test(entry)) {
            if (!isPermittedFixture(root, full)) {
              issues.push(
                'Temporary/generated directory: ' + relative(root, full).replaceAll('\\', '/')
              );
            }
            flagged = true;
            break;
          }
        }
        if (flagged) continue;
        // Skip walk dirs (performance).
        if (SKIP_WALK_DIRS.has(entry)) continue;
        walk(full, depth + 1);
      } else if (st.isFile()) {
        if (entry.endsWith('.tsbuildinfo')) {
          if (!isPermittedFixture(root, full)) {
            issues.push(
              'Stale tsbuildinfo: ' + relative(root, full).replaceAll('\\', '/')
            );
          }
        }
      }
    }
  }

  walk(root, 0);
  return { ok: issues.length === 0, issues };
}

export async function main(argv: readonly string[]): Promise<number> {
  let repoRoot = process.cwd();
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--repo-root' && i + 1 < argv.length) repoRoot = argv[++i];
    else if (argv[i] === '--help' || argv[i] === '-h') {
      process.stdout.write('gspl-check-clean [--repo-root <path>]\n');
      return 0;
    }
  }
  const result = checkCleanSource(repoRoot);
  for (const issue of result.issues) process.stderr.write('ISSUE: ' + issue + '\n');
  if (result.ok) process.stderr.write('Clean source: PASS\n');
  else process.stderr.write('Clean source: FAIL (' + result.issues.length + ' issues)\n');
  return result.ok ? 0 : 2;
}
