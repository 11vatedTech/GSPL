/**
 * Type definitions for the reference indexer.
 *
 * All types are defined locally until @gspl/types is fully integrated (§8).
 */

export type FileClassification =
  | 'source' | 'test' | 'spec' | 'docs' | 'config'
  | 'example' | 'binary' | 'data' | 'report' | 'unknown';

export interface FileEntry {
  path: string;
  sha256: string;
  bytes: number;
  classification: FileClassification;
  lines: number;
}

export interface RepoConfig {
  id: string;
  name: string;
  sourceType: 'directory' | 'zip';
  source: string;
  description?: string;
  invariants?: readonly string[];
}

export interface ReferenceFileRecord {
  sourceUri: string;
  repositoryId: string;
  relativePath: string;
  extension: string;
  language: string;
  category: FileClassification;
  contentHash: string;
  byteSize: number;
  lineCount: number;
  isTest: boolean;
  isDocumentation: boolean;
  isGenerated: boolean;
  isBuildArtifact: boolean;
  symbolIndexStatus: 'indexed' | 'lexical-fallback' | 'not-indexed';
  symbols?: import('./symbols.js').SymbolRecord[];
  scanPolicyVersion: '1.0';
}

export interface SourceManifest {
  schema: 'gspl.reference-manifest';
  schemaVersion: '1.0';
  repos: readonly RepoConfig[];
  files: readonly ReferenceFileRecord[];
  duplicates: readonly DuplicateGroup[];
  totalFiles: number;
  totalBytes: number;
  generatedAt: string;
  manifestHash: string;
}

export interface DuplicateGroup {
  sha256: string;
  files: { repo: string; path: string; bytes: number }[];
}

export interface IndexStatistics {
  totalFiles: number;
  totalBytes: number;
  filesByRepo: Record<string, number>;
  filesByExtension: Record<string, number>;
  filesByLanguage: Record<string, number>;
  sourceFiles: number;
  testFiles: number;
  documentationFiles: number;
  configurationFiles: number;
  generatedFiles: number;
  excludedEntries: number;
  unreadableEntries: number;
  duplicateGroups: number;
  nearDuplicateGroups: number;
}
