/** collect.mts — typed deterministic directory walker.
 *  Throws on filesystem errors. No regex inside template literals. */
import { readFileSync, readdirSync, lstatSync } from 'node:fs';
import { join, relative, basename as pathBasename } from 'node:path';
import { createHash } from 'node:crypto';
import {
  SOURCE_EXTENSIONS,
  SOURCE_BASENAMES,
  EXCLUDE_DIRS,
  EXCLUDE_SUFFIXES,
  FILE_MODE,
  toLogicalPath,
} from './policy.mts';

export interface ManifestEntry {
  readonly path: string;
  readonly size: number;
  readonly hash: string;
  readonly mode: number;
  readonly kind: 'file';
}

export function shouldInclude(name: string): boolean {
  const base = pathBasename(name);
  const dot = base.lastIndexOf('.');
  const ext = dot < 0 ? '' : base.slice(dot);
  if (ext === '') {
    return SOURCE_BASENAMES.has(base) && !EXCLUDE_SUFFIXES.some(re => re.test(name));
  }
  if (!SOURCE_EXTENSIONS.has(ext)) return false;
  return !EXCLUDE_SUFFIXES.some(re => re.test(name));
}

export function collectEntries(projectRoot: string): ManifestEntry[] {
  const out: ManifestEntry[] = [];
  walk(projectRoot, projectRoot, out);
  out.sort(unicodeCmp);
  return out;
}

function unicodeCmp(a: ManifestEntry, b: ManifestEntry): number {
  if (a.path < b.path) return -1;
  if (a.path > b.path) return 1;
  return 0;
}

function walk(root: string, dir: string, out: ManifestEntry[]): void {
  let items: string[];
  try { items = readdirSync(dir); }
  catch (err) { throw new Error('Failed to read ' + dir + ': ' + (err as Error).message); }
  for (const item of items) {
    const full = join(dir, item);
    if (EXCLUDE_DIRS.has(item)) continue;
    let st;
    try { st = lstatSync(full); }
    catch (err) { throw new Error('Failed to stat ' + full + ': ' + (err as Error).message); }
    if (st.isSymbolicLink()) throw new Error('Refusing symlink: ' + full);
    if (st.isDirectory()) { walk(root, full, out); continue; }
    if (!st.isFile()) continue;
    const rel = toLogicalPath(relative(root, full));
    if (!shouldInclude(rel)) continue;
    const content = readFileSync(full);
    out.push({
      path: rel,
      size: st.size,
      hash: 'sha256:' + createHash('sha256').update(content).digest('hex'),
      mode: FILE_MODE,
      kind: 'file',
    });
  }
}
