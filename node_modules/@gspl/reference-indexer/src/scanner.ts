import { readdir, stat, readFile } from 'node:fs/promises';
import { join, relative, sep, extname, basename } from 'node:path';
import { shouldExcludeDir, shouldExcludeFile, classifyFile, normalizePath } from './policy.js';
import { hashFile } from './hasher.js';
import { DirectorySource, ZipArchiveSource, type ReferenceSource } from './zip-source.js';
import { extractSymbols, canExtractSymbols } from './symbols.js';
import type { RepoConfig, ReferenceFileRecord, FileClassification } from './types.js';

// Re-export for backward compatibility
export type { ReferenceSource } from './zip-source.js';
export { DirectorySource, ZipArchiveSource } from './zip-source.js';
export type { SymbolRecord } from './symbols.js';

export interface ScanResult {
  repo: RepoConfig;
  files: readonly ReferenceFileRecord[];
}

function sourceFor(repo: RepoConfig): ReferenceSource {
  return repo.sourceType === 'zip' ? new ZipArchiveSource() : new DirectorySource();
}

export async function scanRepo(repo: RepoConfig): Promise<ScanResult> {
  const source = sourceFor(repo);
  let files = await source.scan(repo);
  const enriched: ReferenceFileRecord[] = [];
  for (const f of files) {
    if (canExtractSymbols(f.extension)) {
      try {
        const absPath = repo.sourceType === 'zip'
          ? f.relativePath
          : join(repo.source, f.relativePath.split('/').join(sep));
        if (repo.sourceType !== 'zip') {
          const raw = await readFile(absPath, 'utf-8');
          const result = extractSymbols(raw, f.language);
          enriched.push({ ...f, symbolIndexStatus: result.status, symbols: result.symbols });
        } else { enriched.push(f); }
      } catch { enriched.push(f); }
    } else { enriched.push(f); }
  }
  return { repo, files: enriched };
}

export function pathSegments(absPath: string): string[] {
  return absPath.split(sep).filter(Boolean);
}
