/**
 * JSON Canonicalization Scheme (JCS, RFC 8785) — adapted to GSPL data.
 *
 * Per `packages/canon-foundation/test/canon-foundation.test.ts`:
 *  - Same seed ⇒ same canonical bytes.
 *  - `$hash` excluded from hash material.
 *  - `$lineage.timestamp` excluded from hash material.
 *  - Object keys sorted lexicographically within each nested object.
 *  - Numeric values use shortest round-trippable form (e.g., 1.5 ⇒ "1.5", not "1.50").
 *  - `canonicalizeGene(gene)` returned bytes contain `"scalar"` for a typed gene.
 *
 * This is a faithful but intentionally MINIMAL subset of RFC 8785. Full RFC 8785
 * covers a wider edge-case set (NaN, BigInt, surrogate pairs). For Prompt 1
 * canon purposes, the implementations of NaN/BigInt are explicit no-ops (we
 * never carry them through canon-foundation). Unicode preservation is via
 * UTF-8 without escaping (sufficient for round-trip stability through Node).
 */
import type { Gene, UniversalSeed } from '../types/universal-seed.js';
/**
 * Compute the canonical byte sequence of a UniversalSeed.
 *
 * The bytes are UTF-8. Same input ⇒ same output (deterministic).
 */
export declare function canonicalize(seed: UniversalSeed): Uint8Array;
/**
 * Compute the canonical byte sequence of a single Gene value.
 */
export declare function canonicalizeGene(gene: Gene): Uint8Array;
/**
 * Compute the canonical byte sequence of an arbitrary value (e.g. governance
 * metadata) under the same JCS rules, for use by conformance tooling.
 */
export declare function canonicalizeAny(value: unknown): Uint8Array;
//# sourceMappingURL=jcs.d.ts.map