/** policy.mts — paths and inclusion/exclusion sets. No I/O. */
import { join } from 'node:path';

export interface ArchivePaths {
  readonly projectRoot: string;
  readonly outputDir: string;
  readonly archivePath: string;
  readonly archiveSha256Path: string;
  readonly manifestPath: string;
  readonly manifestSha256Path: string;
}

export function archivePaths(projectRoot: string): ArchivePaths {
  const outputDir = join(projectRoot, 'build');
  return {
    projectRoot,
    outputDir,
    archivePath: join(outputDir, 'gspl-canon-source.tar.gz'),
    archiveSha256Path: join(outputDir, 'gspl-canon-source.tar.gz.sha256'),
    manifestPath: join(outputDir, 'gspl-canon-source-manifest.json'),
    manifestSha256Path: join(outputDir, 'gspl-canon-source-manifest.json.sha256'),
  };
}

export const SOURCE_EXTENSIONS: ReadonlySet<string> = new Set([
  '.ts', '.tsx', '.mts', '.cts', '.js', '.mjs', '.cjs',
  '.json', '.md', '.mdx', '.yaml', '.yml', '.toml',
  '.txt', '.html', '.css', '.scss',
]);
export const SOURCE_BASENAMES: ReadonlySet<string> = new Set([
  '.gitignore', '.gitattributes', '.env.example', 'Dockerfile', 'LICENSE',
]);
export const EXCLUDE_DIRS: ReadonlySet<string> = new Set([
  'node_modules', 'dist', 'coverage', '.vite', '.git',
  'build', '.nyc_output', '.cache', '.turbo',
  'Reference-repos_and_planning',
]);
export const EXCLUDE_SUFFIXES: readonly RegExp[] = [
  /\u002Etsbuildinfo$/,
  /~$/,
  /\u002Etmp$/,
  /\u002EDS_Store$/,
  /Thumbs\u002Edb$/,
];
export const FILE_MODE = 0o644;

export function toLogicalPath(p: string): string {
  const BACKSLASH = String.fromCharCode(92);
  return p.split(BACKSLASH).join('/');
}
