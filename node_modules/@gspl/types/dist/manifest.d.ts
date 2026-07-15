import type { Disposition } from './disposition.js';
export type FileClassification = 'source' | 'test' | 'spec' | 'docs' | 'config' | 'example' | 'binary' | 'data' | 'report' | 'unknown';
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
    /** 'directory' | 'zip' */
    sourceType: 'directory' | 'zip';
    /** Repo-relative path to the source (directory or ZIP archive) */
    source: string;
    description?: string;
    invariants?: readonly string[];
}
export interface ArchiveSourceDescriptor {
    /** Stable identifier */
    id: string;
    /** 'zip' — the only archive type supported in Prompt 1 */
    sourceType: 'zip';
    /** Repo-relative path to the ZIP archive */
    source: string;
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
    files: readonly {
        repo: string;
        path: string;
        bytes: number;
    }[];
}
export interface NearDuplicateGroup {
    similarity: number;
    files: readonly {
        repo: string;
        path: string;
        sha256: string;
    }[];
    reason: string;
}
export interface ConflictGroup {
    /** Subsystem affected */
    subsystem: string;
    /** Files implementing the same subsystem differently */
    files: readonly {
        repo: string;
        path: string;
        sha256: string;
    }[];
    /** Recommended disposition */
    disposition: Disposition;
    /** Rationale for the disposition */
    rationale: string;
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
//# sourceMappingURL=manifest.d.ts.map