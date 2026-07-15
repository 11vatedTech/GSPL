/** Seed operations — Prompt 2 §5-6 */
import type { CanonicalSeed } from './seed.js';
export type HashPolicy = 'HASHED' | 'NON_HASHED' | 'DERIVED' | 'AUTHORING_ONLY' | 'RUNTIME_ONLY';
export declare const HASH_POLICY: Record<string, HashPolicy>;
export declare function isHashedField(fieldPath: string): boolean;
/**
 * Extract only HASHED fields for canonical hash computation.
 * Excludes: DERIVED (contentId), NON_HASHED (timestamps, validation reqs), AUTHORING_ONLY, RUNTIME_ONLY.
 */
export declare function extractCanonicalHashMaterial(seed: CanonicalSeed): Record<string, unknown>;
export declare function makePrimordialSeed(overrides: Partial<CanonicalSeed>): CanonicalSeed;
/**
 * Recursive canonical normalizer — replaces JSON.parse(JSON.stringify).
 * Uses GSPL JCS (JSON Canonicalization Scheme) from canon-foundation.
 * - Sorts object keys lexicographically
 * - Strips undefined values
 * - Normalizes Unicode (NFKC)
 * - Normalizes number representations
 */
export declare function normalizeSeed(seed: CanonicalSeed): CanonicalSeed;
/** Compute canonical bytes of a seed using JCS */
export declare function canonicalizeSeed(seed: CanonicalSeed): Uint8Array;
/** Extract fields for content hashing (backward-compatible) */
export declare function hashMaterialFromSeed(seed: CanonicalSeed): Record<string, unknown>;
/** Compute SHA-256 content hash of a seed */
export declare function computeSeedHash(seed: CanonicalSeed): string;
/** Verify a seed's content hash matches its identity.contentId */
export declare function verifySeedHash(seed: CanonicalSeed): {
    ok: boolean;
    expected: string;
    actual: string;
};
//# sourceMappingURL=seed-ops.d.ts.map