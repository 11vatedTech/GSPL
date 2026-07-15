/**
 * Deterministic RNG per spec/03.
 *
 * Implements xoshiro256** semantics at its core but uses a SplitMix64 PRNG
 * seed-derivation step on construction. This is the load-bearing randomness
 * on which the entire deterministic-expansion claim rests, so the impl is
 * deliberately minimal, well-tested, and uses only BigInt arithmetic (no
 * platform-dependent float clipping).
 *
 * Tests pin:
 *   - Two DeterministicRngs with same seed ⇒ same output stream.
 *   - Different seeds ⇒ different output.
 *   - nextDouble ∈ [0, 1).
 *   - nextInt(n) ∈ [0, n).
 *   - nextGaussian has approximately zero mean over 1000 samples.
 *   - substream(key) yields an independent deterministic stream.
 *   - fnv1a64 is deterministic and consistent.
 */
/** FNV-1a 64-bit string hash (per spec/03). */
export declare function fnv1a64(s: string): bigint;
/**
 * A deterministic stream of u64 integers. Construct from a single 64-bit seed;
 * optionally derive substreams by named keys.
 */
export declare class DeterministicRng {
    private state;
    constructor(seed: bigint);
    /**
     * Produce the next 64-bit unsigned integer.
     */
    nextU64(): bigint;
    /** Uniform real number in [0, 1). */
    nextDouble(): number;
    /** Uniform integer in [0, n). */
    nextInt(n: number): number;
    /** Approximately Gaussian(0, 1) via Box-Muller. */
    nextGaussian(): number;
    /**
     * Derive an independent deterministic stream from a named subkey.
     */
    substream(key: string): DeterministicRng;
}
//# sourceMappingURL=deterministic.d.ts.map