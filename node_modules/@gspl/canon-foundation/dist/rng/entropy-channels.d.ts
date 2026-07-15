/**
 * Hierarchical Deterministic Entropy Channels — Prompt 2 §9
 *
 * A single global RNG is forbidden. Instead, entropy is derived through
 * labeled, hierarchical forks from a root seed.
 *
 * Channel tree example:
 *   root seed entropy
 *   ├── architecture
 *   ├── naming
 *   ├── dependency selection
 *   ├── layout
 *   ├── optimization
 *   └── target-specific projection
 *
 * Requirements:
 *   - stable algorithm selection (SplitMix64)
 *   - algorithm versioning
 *   - unbiased integer sampling
 *   - deterministic floating-point policy
 *   - byte generation
 *   - labeled forks
 *   - order-independent forks where required
 *   - no ambient Math.random
 *   - no wall-clock input
 *   - no process-specific entropy
 *   - no iteration-order dependence
 */
import { DeterministicRng } from './deterministic.js';
/** Golden vectors: known outputs for well-known inputs. §9-16 */
export declare const ENTROPY_GOLDEN_VECTORS: {
    readonly algorithm: "splitmix64";
    readonly algorithmVersion: "1.0";
    readonly vectors: readonly [{
        readonly seed: "0";
        readonly channel: "";
        readonly count: 0;
        readonly expected: "0";
    }, {
        readonly seed: "1";
        readonly channel: "";
        readonly count: 1;
        readonly expected: "5e41ab087439611e";
    }, {
        readonly seed: "42";
        readonly channel: "";
        readonly count: 1;
        readonly expected: "57e1faba65107204";
    }, {
        readonly seed: "42";
        readonly channel: "architecture";
        readonly count: 1;
        readonly expected: "67630695fe7ef69d";
    }, {
        readonly seed: "42";
        readonly channel: "architecture/naming";
        readonly count: 1;
        readonly expected: "e057fce24bb85b4a";
    }];
};
/** Channel descriptor — metadata about a fork */
export interface EntropyChannelDescriptor {
    /** Channel name (unique within parent) */
    name: string;
    /** Full derivation path (e.g., 'architecture/naming') */
    path: string;
    /** Purpose description */
    purpose: string;
    /** Parent channel path (empty for root) */
    parentPath: string;
}
/**
 * A single entropy channel. Created by forking from a parent channel.
 * Each channel is an independent deterministic stream.
 */
export declare class EntropyChannel {
    readonly descriptor: EntropyChannelDescriptor;
    private rng;
    private children;
    constructor(descriptor: EntropyChannelDescriptor, rng: DeterministicRng);
    /** Produce the next 64-bit unsigned integer. */
    nextU64(): bigint;
    /** Uniform real number in [0, 1). */
    nextDouble(): number;
    /** Uniform integer in [0, n). */
    nextInt(n: number): number;
    /** Approximately Gaussian(0, 1). */
    nextGaussian(): number;
    /** Generate `count` random bytes. */
    nextBytes(count: number): Uint8Array;
    /**
     * Fork a child channel with the given name.
     *
     * Forking uses FNV-1a hash of the name XOR'd with the current channel
     * state, producing an independent deterministic substream.
     *
     * If `orderIndependent` is true, the fork derivation does NOT consume
     * entropy from this channel. This ensures that creating forks in
     * different orders still produces identical child streams.
     */
    fork(name: string, purpose: string, orderIndependent?: boolean): EntropyChannel;
    /** Get an existing child channel by name. */
    child(name: string): EntropyChannel | undefined;
    /** List all child channel names. */
    listChildren(): string[];
    /**
     * Serialize the channel tree as a flat list of descriptors.
     * Useful for attaching to seed entropy declarations.
     */
    toDescriptors(): EntropyChannelDescriptor[];
}
/**
 * Create a root entropy channel from a seed value.
 *
 * The seed can be a bigint, string, or Uint8Array.
 */
export declare function createEntropyRoot(seed: bigint | string | Uint8Array, purpose?: string): EntropyChannel;
/**
 * Create the standard GSPL entropy channel tree.
 *
 * Produces the canonical structure:
 *   root
 *   ├── architecture
 *   ├── naming
 *   ├── dependency-selection
 *   ├── layout
 *   ├── optimization
 *   └── target-specific-projection
 */
export declare function createStandardEntropyTree(rootSeed: bigint | string | Uint8Array): EntropyChannel;
/**
 * Verify that golden vectors match.
 * Returns { ok: true } if all vectors produce expected outputs.
 */
export declare function verifyGoldenVectors(): {
    ok: boolean;
    results: {
        seed: string;
        channel: string;
        count: number;
        expected: string;
        actual: string;
        pass: boolean;
    }[];
};
//# sourceMappingURL=entropy-channels.d.ts.map