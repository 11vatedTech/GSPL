import type { RepoConfig, ReferenceFileRecord } from './types.js';
export type { ReferenceSource } from './zip-source.js';
export { DirectorySource, ZipArchiveSource } from './zip-source.js';
export type { SymbolRecord } from './symbols.js';
export interface ScanResult {
    repo: RepoConfig;
    files: readonly ReferenceFileRecord[];
}
export declare function scanRepo(repo: RepoConfig): Promise<ScanResult>;
export declare function pathSegments(absPath: string): string[];
//# sourceMappingURL=scanner.d.ts.map