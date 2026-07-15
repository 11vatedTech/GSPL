/**
 * ReferenceSource abstraction with DirectorySource and ZipArchiveSource.
 *
 * §1 — the scanner supports both directory and ZIP-archive reference
 * repositories. Both sources produce identical ReferenceFileRecord shapes.
 */
import type { RepoConfig, ReferenceFileRecord } from './types.js';
export interface ReferenceSource {
    scan(repo: RepoConfig): Promise<readonly ReferenceFileRecord[]>;
}
export declare class DirectorySource implements ReferenceSource {
    scan(repo: RepoConfig): Promise<readonly ReferenceFileRecord[]>;
}
export declare class ZipArchiveSource implements ReferenceSource {
    scan(repo: RepoConfig): Promise<readonly ReferenceFileRecord[]>;
}
//# sourceMappingURL=zip-source.d.ts.map