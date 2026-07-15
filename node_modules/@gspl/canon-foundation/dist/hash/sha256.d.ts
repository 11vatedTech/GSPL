/**
 * SHA-256 content addresser per spec/05.
 *
 * Exposes:
 *  - `sha256String(msg)` — pure JS impl of SHA-256 returning lowercase hex.
 *  - `HASH_PREFIX` — the canonical "sha256:" string prefix.
 *  - `hashSeed(seed)` — canonical bytes (via JCS) + SHA-256, prefixed.
 *  - `verifyHash(seed)` — true iff $hash matches canonical content hash.
 *  - `hashToRngSeed(hash)` — first 8 bytes interpreted as unsigned big-endian u64.
 */
import type { UniversalSeed } from '../types/universal-seed.js';
/** Locked content-hash prefix; mirrors spec/05. */
export declare const HASH_PREFIX: "sha256:";
/**
 * Pure-JS cryptographic SHA-256 (FIPS 180-4).
 *
 * Avoids any requirement on Node `crypto` (so the canon stays pure for
 * cross-runtime verification), but works correctly. This is intentionally a
 * faithful textbook implementation; tests pin it to the well-known NIST
 * vectors for empty string and "abc".
 */
export declare function sha256String(message: string): string;
export declare function sha256Bytes(bytes: Uint8Array): string;
/**
 * Compute the canonical content-hash of a UniversalSeed.
 * Output: HASH_PREFIX + lowercase hex 64 chars.
 */
export declare function hashSeed(seed: UniversalSeed): string;
/**
 * Verify that a seed's `$hash` matches its canonical content hash.
 */
export declare function verifyHash(seed: UniversalSeed): boolean;
/**
 * Convert a content-hash to a numeric u64 RNG seed, preserving determinism.
 *
 * Implementation: take the first 8 bytes of the hex after HASH_PREFIX as
 * unsigned big-endian.
 */
export declare function hashToRngSeed(hash: string): bigint;
//# sourceMappingURL=sha256.d.ts.map