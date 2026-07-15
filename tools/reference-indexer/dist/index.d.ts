/**
 * @gspl/reference-indexer
 *
 * Deterministic reference-inventory tool. Walks configured reference
 * repositories, inventories files and symbols, hashes files, detects duplicate
 * and near-duplicate files, detects conflicting implementations, and emits
 * stable machine-readable manifests.
 *
 * Properties:
 *  - Deterministic: same input ⇒ same manifest, byte-for-byte.
 *  - Configured, not environment-dependent: NO machine-specific paths.
 *  - Excludes build artifacts by EXPLICIT policy, not by implicit glob.
 *  - Operates incrementally (via hash-sharded manifest).
 */
export * from './scanner.js';
export * from './hasher.js';
export * from './manifest.js';
export * from './policy.js';
export * from './types.js';
export { main } from './cli.js';
//# sourceMappingURL=index.d.ts.map