/**
 * File-classification and exclusion policy.
 *
 * Explicit allowlist for source-code, documentation, configuration, shader,
 * and other canonical extensions. Extensionless important files are recognized
 * by basename. Build artifacts, dependency caches, and binary media are excluded.
 */

import type { FileClassification } from './types.js';

// ── Excluded directories (build / dep caches only) ──
export const EXCLUDED_DIRS: readonly string[] = [
  'node_modules', '.git', 'dist', 'build', 'coverage', '.vite', '.next',
  '.nuxt', 'target', 'bin', 'obj', 'vendor', '__pycache__', '.pytest_cache',
  '.idea', '.vscode', '.turbo', '.vercel', 'out', 'tmp-test',
  'paradigm-out', 'golden', 'sidecars', 'tmp',
];

// ── Excluded basenames (artifacts and lockfiles when analysis is off) ──
export const EXCLUDED_BASENAMES: readonly string[] = [
  '.DS_Store', 'Thumbs.db',
  'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lock',
  '.lock',
];

// ── Binary extensions (excluded unless metadata indexing is on) ──
export const BINARY_EXTENSIONS: readonly string[] = [
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.pdf',
  '.zip', '.tar', '.gz', '.tgz', '.mp4', '.webm', '.mp3', '.ogg',
  '.wav', '.flac', '.ttf', '.otf', '.woff', '.woff2', '.exe', '.dll',
  '.so', '.dylib', '.wasm', '.bin', '.dat', '.db', '.sqlite',
];

// ── Extension classification (explicit allowlist per user spec §2) ──
const EXTENSION_CLASSIFICATION: Record<string, FileClassification> = {
  // C-family
  '.c': 'source', '.cc': 'source', '.cpp': 'source', '.cxx': 'source',
  '.h': 'source', '.hh': 'source', '.hpp': 'source', '.hxx': 'source',
  // .NET
  '.cs': 'source', '.fs': 'source', '.fsx': 'source',
  // Go
  '.go': 'source',
  // JVM
  '.java': 'source', '.kt': 'source', '.kts': 'source',
  // Rust / Swift
  '.rs': 'source', '.swift': 'source',
  // Python
  '.py': 'source', '.pyx': 'source',
  // JavaScript family
  '.js': 'source', '.jsx': 'source', '.mjs': 'source', '.cjs': 'source',
  '.ts': 'source', '.tsx': 'source',
  // Web frameworks
  '.vue': 'source', '.svelte': 'source',
  // Scripting
  '.lua': 'source', '.rb': 'source', '.php': 'source',
  '.sh': 'source', '.ps1': 'source', '.bat': 'source', '.cmd': 'source',
  // Data / query
  '.sql': 'source', '.graphql': 'source', '.gql': 'source', '.proto': 'source',
  // WebAssembly / IR
  '.wat': 'source', '.wast': 'source',
  '.ll': 'source', '.mlir': 'source',
  // GSPL-specific
  '.gspl': 'source', '.gseed': 'data',
  // Serialization
  '.json': 'data', '.jsonc': 'config',
  '.yaml': 'config', '.yml': 'config', '.toml': 'config', '.xml': 'config',
  // Documentation
  '.md': 'docs', '.mdx': 'docs', '.txt': 'docs', '.rst': 'docs',
  // Shaders
  '.glsl': 'source', '.vert': 'source', '.frag': 'source', '.comp': 'source',
  '.hlsl': 'source', '.wgsl': 'source', '.shader': 'source',
  // Web
  '.html': 'source', '.css': 'source', '.scss': 'source', '.less': 'source',
};

// ── Extensionless important files (recognized by basename) ──
const EXTENSIONLESS_SOURCE: ReadonlySet<string> = new Set([
  'Dockerfile', 'Makefile', 'LICENSE', 'README', 'CHANGELOG',
  'CMakeLists.txt', 'BUILD', 'WORKSPACE',
  '.gitignore', '.dockerignore', '.env.example',
]);

const EXTENSIONLESS_CLASSIFICATION: Record<string, FileClassification> = {
  'Dockerfile': 'config',
  'Makefile': 'config',
  'LICENSE': 'docs',
  'README': 'docs',
  'CHANGELOG': 'docs',
  'CMakeLists.txt': 'config',
  'BUILD': 'config',
  'WORKSPACE': 'config',
  '.gitignore': 'config',
  '.dockerignore': 'config',
  '.env.example': 'config',
};

// ── Path-pattern overrides ──
const PATH_PATTERN_CLASSIFICATION: { match: RegExp; as: FileClassification }[] = [
  { match: /(^|\/)test\//, as: 'test' },
  { match: /(^|\/)tests\//, as: 'test' },
  { match: /\.test\.[a-z]+$/, as: 'test' },
  { match: /\.spec\.[a-z]+$/, as: 'test' },
  { match: /(^|\/)spec\//, as: 'spec' },
  { match: /(^|\/)docs?\//, as: 'docs' },
  { match: /(^|\/)examples?\//, as: 'example' },
  // Generated/minified files (excluded from canonical index)
  { match: /\.min\.(js|css)$/, as: 'binary' },
  { match: /\.map$/, as: 'binary' },
];

export function shouldExcludeDir(name: string): boolean {
  return EXCLUDED_DIRS.includes(name);
}

export function shouldExcludeFile(name: string): boolean {
  if (EXCLUDED_BASENAMES.includes(name)) return true;
  // Exclude lockfiles when analysis is off (always for now).
  return false;
}

export function classifyFile(relPath: string): FileClassification {
  const basename = relPath.split('/').pop() ?? '';

  // Check binary extensions first.
  const lower = basename.toLowerCase();
  for (const ext of BINARY_EXTENSIONS) {
    if (lower.endsWith(ext)) return 'binary';
  }

  // Path-pattern overrides (test/, spec/, docs/, examples/).
  for (const p of PATH_PATTERN_CLASSIFICATION) {
    if (p.match.test(relPath)) return p.as;
  }

  // Extension-based classification.
  for (const [ext, cls] of Object.entries(EXTENSION_CLASSIFICATION)) {
    if (lower.endsWith(ext)) return cls;
  }

  // Extensionless important files.
  if (EXTENSIONLESS_SOURCE.has(basename)) {
    return EXTENSIONLESS_CLASSIFICATION[basename] ?? 'source';
  }

  return 'unknown';
}

export function normalizePath(p: string): string {
  return p.split(String.fromCharCode(92)).join(String.fromCharCode(47));
}
