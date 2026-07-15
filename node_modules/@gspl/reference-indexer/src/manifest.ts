import { createHash } from 'node:crypto';
import type {
  RepoConfig, ReferenceFileRecord, SourceManifest,
  DuplicateGroup, IndexStatistics,
} from './types.js';

export interface ManifestInput {
  repos: readonly RepoConfig[];
  filesByRepo: ReadonlyMap<string, readonly ReferenceFileRecord[]>;
}

const SCHEMA = 'gspl.reference-manifest' as const;
const SCHEMA_VERSION = '1.0' as const;

export function buildManifest(input: ManifestInput): SourceManifest {
  const allFiles: ReferenceFileRecord[] = [];
  for (const [, entries] of input.filesByRepo) {
    for (const e of entries) allFiles.push(e);
  }

  // Compute duplicates by contentHash.
  const byHash = new Map<string, { repo: string; path: string; bytes: number }[]>();
  for (const f of allFiles) {
    const g = byHash.get(f.contentHash) ?? [];
    g.push({ repo: f.repositoryId, path: f.relativePath, bytes: f.byteSize });
    byHash.set(f.contentHash, g);
  }
  const duplicates: DuplicateGroup[] = [];
  for (const [sha256, files] of byHash) {
    if (files.length > 1) duplicates.push({ sha256, files });
  }
  duplicates.sort((a, b) => (a.sha256 < b.sha256 ? -1 : a.sha256 > b.sha256 ? 1 : 0));
  for (const d of duplicates) {
    d.files.sort((a, b) => a.repo < b.repo ? -1 : a.repo > b.repo ? 1 : a.path < b.path ? -1 : 1);
  }

  // Sort files deterministically.
  allFiles.sort((a, b) => {
    const r = a.repositoryId.localeCompare(b.repositoryId);
    return r !== 0 ? r : a.relativePath.localeCompare(b.relativePath);
  });

  const totalFiles = allFiles.length;
  const totalBytes = allFiles.reduce((s, f) => s + f.byteSize, 0);

  // Build statistics.
  const extCount: Record<string, number> = {};
  const langCount: Record<string, number> = {};
  const repoCount: Record<string, number> = {};
  let srcFiles = 0, testFiles = 0, docFiles = 0, cfgFiles = 0, genFiles = 0;
  for (const f of allFiles) {
    extCount[f.extension] = (extCount[f.extension] ?? 0) + 1;
    langCount[f.language] = (langCount[f.language] ?? 0) + 1;
    repoCount[f.repositoryId] = (repoCount[f.repositoryId] ?? 0) + 1;
    switch (f.category) {
      case 'source': srcFiles++; break;
      case 'test': case 'spec': testFiles++; break;
      case 'docs': docFiles++; break;
      case 'config': cfgFiles++; break;
    }
    if (f.isGenerated) genFiles++;
  }

  const manifestNoHash: Omit<SourceManifest, 'manifestHash'> = {
    schema: SCHEMA,
    schemaVersion: SCHEMA_VERSION,
    repos: [...input.repos].sort((a, b) => a.id.localeCompare(b.id)),
    files: allFiles,
    duplicates,
    totalFiles,
    totalBytes,
    generatedAt: '',
  };

  const manifestHash = 'sha256:' + createHash('sha256')
    .update(JSON.stringify(manifestNoHash))
    .digest('hex');

  return { ...manifestNoHash, generatedAt: new Date().toISOString(), manifestHash };
}

export function buildStatistics(files: readonly ReferenceFileRecord[]): IndexStatistics {
  const extCount: Record<string, number> = {};
  const langCount: Record<string, number> = {};
  const repoCount: Record<string, number> = {};
  let srcFiles = 0, testFiles = 0, docFiles = 0, cfgFiles = 0, genFiles = 0;
  for (const f of files) {
    extCount[f.extension] = (extCount[f.extension] ?? 0) + 1;
    langCount[f.language] = (langCount[f.language] ?? 0) + 1;
    repoCount[f.repositoryId] = (repoCount[f.repositoryId] ?? 0) + 1;
    switch (f.category) {
      case 'source': srcFiles++; break;
      case 'test': case 'spec': testFiles++; break;
      case 'docs': docFiles++; break;
      case 'config': cfgFiles++; break;
    }
    if (f.isGenerated) genFiles++;
  }
  return {
    totalFiles: files.length,
    totalBytes: files.reduce((s, f) => s + f.byteSize, 0),
    filesByRepo: repoCount,
    filesByExtension: extCount,
    filesByLanguage: langCount,
    sourceFiles: srcFiles,
    testFiles,
    documentationFiles: docFiles,
    configurationFiles: cfgFiles,
    generatedFiles: genFiles,
    excludedEntries: 0,
    unreadableEntries: 0,
    duplicateGroups: 0,
    nearDuplicateGroups: 0,
  };
}

export function serializeManifest(m: SourceManifest): string {
  return JSON.stringify(m, null, 2) + '\n';
}
