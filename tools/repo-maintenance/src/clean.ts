import { rmSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const KNOWN_GENERATED_DIRS = new Set([
  'node_modules', 'dist', 'coverage', '.vite', '.next', '.nuxt',
  '.turbo', '.vercel', 'out', '.tsbuildinfo-cache',
  '__pycache__', '.pytest_cache', '.idea', '.vscode',
]);

// Directories to skip during the recursive tsbuildinfo walk (NOT deleted).
const SKIP_WALK_DIRS = new Set([...KNOWN_GENERATED_DIRS, '.git']);

export interface CleanOptions {
  repoRoot: string;
  dryRun: boolean;
  maxDepth?: number;
}

export function clean(opts: CleanOptions): { deleted: string[]; errors: string[] } {
  const deleted: string[] = [];
  const errors: string[] = [];
  const rootResolved = resolve(opts.repoRoot);

  for (const dir of KNOWN_GENERATED_DIRS) {
    const target = resolve(rootResolved, dir);
    if (!existsSync(target)) continue;
    if (!target.startsWith(rootResolved)) {
      errors.push('Refusing to delete path outside repo: ' + target);
      continue;
    }
    try {
      if (opts.dryRun) {
        deleted.push('[dry-run] ' + target);
      } else {
        rmSync(target, { recursive: true, force: true });
        deleted.push(target);
      }
    } catch (e) {
      errors.push('Failed to delete ' + target + ': ' + String(e));
    }
  }

  // Walk for tsbuildinfo files, skipping known generated dirs at every level.
  const maxDepth = opts.maxDepth ?? 20;
  const visited = new Set<string>();
  function walk(dir: string, depth: number) {
    if (depth > maxDepth || visited.has(dir)) return;
    visited.add(dir);
    let entries: string[];
    try { entries = readdirSync(dir); } catch { return; }
    for (const entry of entries) {
      const full = join(dir, entry);
      if (!full.startsWith(rootResolved)) continue;
      if (SKIP_WALK_DIRS.has(entry)) continue;
      let st;
      try { st = statSync(full); } catch { continue; }
      if (st.isDirectory()) {
        walk(full, depth + 1);
      } else if (entry.endsWith('.tsbuildinfo')) {
        try {
          if (opts.dryRun) deleted.push('[dry-run] ' + full);
          else { rmSync(full); deleted.push(full); }
        } catch (e) { errors.push('Failed to delete ' + full + ': ' + String(e)); }
      }
    }
  }
  walk(rootResolved, 0);

  return { deleted, errors };
}

export async function main(argv: readonly string[]): Promise<number> {
  let dryRun = false;
  let repoRoot = process.cwd();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') dryRun = true;
    else if (a === '--repo-root' && i + 1 < argv.length) repoRoot = argv[++i];
    else if (a === '--help' || a === '-h') {
      process.stdout.write('gspl-clean [--dry-run] [--repo-root <path>]\n');
      return 0;
    }
  }
  const result = clean({ repoRoot, dryRun });
  for (const d of result.deleted) process.stderr.write('deleted: ' + d + '\n');
  for (const e of result.errors) process.stderr.write('ERROR: ' + e + '\n');
  return result.errors.length > 0 ? 2 : 0;
}
