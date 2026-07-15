import type { RepoConfig, ReferenceFileRecord, SourceManifest, IndexStatistics } from './types.js';
export interface ManifestInput {
    repos: readonly RepoConfig[];
    filesByRepo: ReadonlyMap<string, readonly ReferenceFileRecord[]>;
}
export declare function buildManifest(input: ManifestInput): SourceManifest;
export declare function buildStatistics(files: readonly ReferenceFileRecord[]): IndexStatistics;
export declare function serializeManifest(m: SourceManifest): string;
//# sourceMappingURL=manifest.d.ts.map