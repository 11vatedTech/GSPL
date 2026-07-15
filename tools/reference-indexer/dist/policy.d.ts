/**
 * File-classification and exclusion policy.
 *
 * Explicit allowlist for source-code, documentation, configuration, shader,
 * and other canonical extensions. Extensionless important files are recognized
 * by basename. Build artifacts, dependency caches, and binary media are excluded.
 */
import type { FileClassification } from './types.js';
export declare const EXCLUDED_DIRS: readonly string[];
export declare const EXCLUDED_BASENAMES: readonly string[];
export declare const BINARY_EXTENSIONS: readonly string[];
export declare function shouldExcludeDir(name: string): boolean;
export declare function shouldExcludeFile(name: string): boolean;
export declare function classifyFile(relPath: string): FileClassification;
export declare function normalizePath(p: string): string;
//# sourceMappingURL=policy.d.ts.map