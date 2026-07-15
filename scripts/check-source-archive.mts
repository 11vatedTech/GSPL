/**
 * check-source-archive.mts — Verify GSPL source archive is clean
 *
 * §2 of Prompt 2 — Clean Source Packaging
 *
 * Opens the produced archive and fails if it contains generated artifacts.
 */

import { readFileSync, existsSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve, basename, extname } from 'node:path';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const PROJECT_ROOT = resolve(process.argv[2] || '.');
const BUILD_DIR = join(PROJECT_ROOT, 'build');

// Forbidden patterns in a clean source archive
const FORBIDDEN_DIRS = ['node_modules', 'dist', 'coverage', '.vite', '.git', 'build', '.nyc_output', '.cache', '.turbo'];
const FORBIDDEN_EXTENSIONS = ['.tsbuildinfo'];
const FORBIDDEN_FILE_PATTERNS = [
  { pattern: /[~]$/, reason: 'backup file' },
  { pattern: /\.tmp$/, reason: 'temporary file' },
  { pattern: /\.DS_Store$/, reason: 'macOS metadata' },
  { pattern: /Thumbs\.db$/, reason: 'Windows thumbnail cache' },
];

interface Violation {
  path: string;
  reason: string;
}

function checkArchive(archivePath: string): { ok: boolean; violations: Violation[] } {
  const violations: Violation[] = [];
  
  if (!existsSync(archivePath)) {
    violations.push({ path: archivePath, reason: 'Archive file not found' });
    return { ok: false, violations };
  }
  
  let fileList: string[] = [];
  
  // Try to list archive contents
  try {
    if (archivePath.endsWith('.tar.gz')) {
      const output = execSync(`tar -tzf "${archivePath}"`, { encoding: 'utf-8', timeout: 15000 });
      fileList = output.trim().split('\n').filter(Boolean);
    } else if (archivePath.endsWith('.zip')) {
      // PowerShell to list zip contents
      const psScript = `
$zip = [System.IO.Compression.ZipFile]::OpenRead('${archivePath.replace(/\/g, '\\')}')
foreach ($e in $zip.Entries) { Write-Output $e.FullName }
$zip.Dispose()
`;
      const output = execSync(`powershell -NoProfile -Command "${psScript}"`, { encoding: 'utf-8', timeout: 15000 });
      fileList = output.trim().split('\n').filter(Boolean);
    } else {
      violations.push({ path: archivePath, reason: 'Unknown archive format. Expected .tar.gz or .zip' });
      return { ok: false, violations };
    }
  } catch (err: any) {
    violations.push({ path: archivePath, reason: 'Failed to read archive: ' + (err.message || String(err)) });
    return { ok: false, violations };
  }
  
  console.log(`Archive contains ${fileList.length} entries.`);
  
  for (const entry of fileList) {
    // Normalize path separators
    const normalized = entry.replace(/\/g, '/').replace(/^\.\//, '');
    const parts = normalized.split('/');
    
    // Check each path component for forbidden directories
    for (const part of parts) {
      if (FORBIDDEN_DIRS.includes(part)) {
        violations.push({ path: normalized, reason: `Contains forbidden directory: ${part}` });
        break;
      }
    }
    
    // Check forbidden extensions
    const ext = extname(normalized);
    if (FORBIDDEN_EXTENSIONS.includes(ext)) {
      violations.push({ path: normalized, reason: `Forbidden extension: ${ext}` });
    }
    
    // Check forbidden patterns
    const base = basename(normalized);
    for (const { pattern, reason } of FORBIDDEN_FILE_PATTERNS) {
      if (pattern.test(base)) {
        violations.push({ path: normalized, reason: `Forbidden file: ${reason}` });
      }
    }
    
    // Check for absolute paths
    if (normalized.match(/^[A-Za-z]:[/\]/)) {
      violations.push({ path: normalized, reason: 'Contains machine-local absolute path' });
    }
  }
  
  return { ok: violations.length === 0, violations };
}

// Main
console.log('Checking GSPL source archive for forbidden content...\n');

let archivePath = join(BUILD_DIR, 'gspl-canon-source.tar.gz');
if (!existsSync(archivePath)) {
  archivePath = join(BUILD_DIR, 'gspl-canon-source.zip');
}

const result = checkArchive(archivePath);

if (result.ok) {
  console.log('\n✅ CLEAN — Source archive contains no forbidden content.');
  
  // Compute archive hash for report
  const archiveContent = readFileSync(archivePath);
  const archiveHash = createHash('sha256').update(archiveContent).digest('hex');
  console.log(`   Archive hash: sha256:${archiveHash}`);
  
  process.exit(0);
} else {
  console.log(`\n❌ CONTAMINATED — ${result.violations.length} violation(s) found:\n`);
  for (const v of result.violations) {
    console.log(`   ${v.path}: ${v.reason}`);
  }
  process.exit(1);
}
