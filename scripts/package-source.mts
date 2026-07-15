/**
 * package-source.mts — Create a source-only GSPL canon archive
 *
 * §2 of Prompt 2 — Clean Source Packaging
 *
 * Packages only source files; excludes node_modules, dist, coverage, build artifacts.
 */

import { createWriteStream, createReadStream, readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, lstatSync } from 'node:fs';
import { join, relative, resolve, basename, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { createGzip } from 'node:zlib';
import { execSync } from 'node:child_process';

const PROJECT_ROOT = resolve(process.argv[2] || '.');
const OUTPUT_DIR = join(PROJECT_ROOT, 'build');
const ARCHIVE_NAME = 'gspl-canon-source.tar.gz';
const ARCHIVE_PATH = join(OUTPUT_DIR, ARCHIVE_NAME);
const MANIFEST_PATH = join(OUTPUT_DIR, 'source-manifest.json');

// Inclusion policy: only these extensions are source
const SOURCE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.mts', '.cts',
  '.js', '.mjs', '.cjs',
  '.json', '.md', '.mdx',
  '.yaml', '.yml', '.toml',
  '.txt', '.html', '.css',
  '.gitignore', '.gitattributes',
  '.env.example',
  'Dockerfile', 'LICENSE',
]);

// Directories to exclude entirely
const EXCLUDE_DIRS = new Set([
  'node_modules', 'dist', 'coverage', '.vite', '.git',
  'build', '.nyc_output', '.cache', '.turbo',
]);

// File patterns to exclude
const EXCLUDE_PATTERNS = [
  /\.tsbuildinfo$/,
  /\~$/,  // backup files
  /\.tmp$/,
  /\.DS_Store$/,
  /Thumbs\.db$/,
];

// Directories to include (even if nested)
const INCLUDE_DIRS = new Set([
  'canon', 'docs', 'packages', 'tools', 'scripts',
  'reference-manifest', 'Reference-repos_and_planning',
]);

interface ManifestEntry {
  path: string;
  size: number;
  hash: string;
}

function shouldIncludeFile(filePath: string): boolean {
  const base = basename(filePath);
  const ext = base.includes('.') ? '.' + base.split('.').slice(1).join('.') : '';
  
  // Check extension
  if (!SOURCE_EXTENSIONS.has(ext) && !SOURCE_EXTENSIONS.has(base)) {
    // Allow files without extensions if they're in known directories
    if (ext !== '') return false;
  }
  
  // Check exclusion patterns
  for (const pattern of EXCLUDE_PATTERNS) {
    if (pattern.test(filePath)) return false;
  }
  
  return true;
}

function walkDir(dir: string, prefix: string = ''): ManifestEntry[] {
  const entries: ManifestEntry[] = [];
  
  let items: string[];
  try {
    items = readdirSync(dir);
  } catch {
    return entries;
  }
  
  for (const item of items) {
    const fullPath = join(dir, item);
    const relPath = prefix ? join(prefix, item) : item;
    
    // Skip excluded directories
    if (EXCLUDE_DIRS.has(item)) continue;
    
    let stat;
    try {
      stat = lstatSync(fullPath);
    } catch {
      continue;
    }
    
    if (stat.isDirectory()) {
      entries.push(...walkDir(fullPath, relPath));
    } else if (stat.isFile()) {
      if (shouldIncludeFile(relPath)) {
        const content = readFileSync(fullPath);
        const hash = createHash('sha256').update(content).digest('hex');
        entries.push({
          path: relPath.replace(/\/g, '/'),
          size: stat.size,
          hash: 'sha256:' + hash,
        });
      }
    }
  }
  
  return entries;
}

function createArchive(entries: ManifestEntry[]): void {
  // Use child_process for tar since we want a proper archive
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  // Write manifest first
  const manifest = {
    schema: 'gspl.source-manifest',
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    projectRoot: PROJECT_ROOT,
    totalFiles: entries.length,
    totalSize: entries.reduce((sum, e) => sum + e.size, 0),
    entries: entries.sort((a, b) => a.path.localeCompare(b.path)),
  };
  
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  
  // Create tar.gz using node:zlib and tar format
  try {
    // Try using system tar if available
    const fileList = entries.map(e => '"' + e.path.replace(/"/g, '\\"') + '"').join(' ');
    
    // Use a tar file list approach
    const fileListPath = join(OUTPUT_DIR, '.filelist.txt');
    writeFileSync(fileListPath, entries.map(e => e.path).join('\n'));
    
    // Try system tar (Windows: use tar.exe which comes with Windows 10+)
    try {
      execSync(`tar -czf "${ARCHIVE_PATH}" -C "${PROJECT_ROOT}" -T "${fileListPath}"`, { 
        stdio: 'pipe',
        timeout: 30000,
      });
    } catch {
      // Fallback: create zip using PowerShell
      console.log('tar not available, falling back to PowerShell zip...');
      const zipPath = ARCHIVE_PATH.replace('.tar.gz', '.zip');
      // PowerShell approach
      const psScript = `
$files = Get-Content '${fileListPath.replace(/\/g, '\\')}'
$archivePath = '${zipPath.replace(/\/g, '\\')}'
if (Test-Path $archivePath) { Remove-Item $archivePath }
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::Open($archivePath, [System.IO.Compression.ZipArchiveMode]::Create)
foreach ($file in $files) {
  $fullPath = Join-Path '${PROJECT_ROOT.replace(/\/g, '\\')}' $file
  if (Test-Path $fullPath) {
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $fullPath, $file)
  }
}
$zip.Dispose()
Write-Output "Archive created: $archivePath"
`;
      execSync(`powershell -NoProfile -Command "${psScript.replace(/"/g, '\\"')}"`, { stdio: 'pipe', timeout: 60000 });
    }
  } catch (err) {
    console.error('Failed to create archive:', err);
    process.exit(1);
  }
  
  // Compute archive hash
  let archiveContent: Buffer;
  try {
    archiveContent = readFileSync(ARCHIVE_PATH);
  } catch {
    const zipPath = ARCHIVE_PATH.replace('.tar.gz', '.zip');
    archiveContent = readFileSync(zipPath);
  }
  const archiveHash = createHash('sha256').update(archiveContent).digest('hex');
  
  console.log(`\nSource archive created:`);
  console.log(`  Path: ${ARCHIVE_PATH}`);
  console.log(`  Files: ${entries.length}`);
  console.log(`  Total size: ${(manifest.totalSize / 1024).toFixed(1)} KB`);
  console.log(`  Archive hash: sha256:${archiveHash}`);
  console.log(`  Manifest: ${MANIFEST_PATH}`);
}

// Main
console.log('Packaging GSPL canon source...\n');

const entries = walkDir(PROJECT_ROOT);

console.log(`Found ${entries.length} source files:`);
const byDir = new Map<string, number>();
for (const e of entries) {
  const d = dirname(e.path) || '(root)';
  byDir.set(d, (byDir.get(d) || 0) + 1);
}
for (const [dir, count] of [...byDir.entries()].sort()) {
  console.log(`  ${dir}: ${count} files`);
}

createArchive(entries);
console.log('\nDone.');
