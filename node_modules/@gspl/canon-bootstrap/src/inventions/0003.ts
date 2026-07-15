import type { InventionEntry } from '../types.js';

export const GSPL_INV_0003: InventionEntry = {
  id: 'GSPL-INV-0003',
  canonicalName: 'Deterministic RNG stack',
  aliases: ['SplitMix+xoshiro+FNV', 'deterministic RNG'],
  founderIntent: 'GSPL reproducibility requires every random decision to flow through a deterministic seedable RNG. The canon-foundation implementation uses SplitMix64 seeding, xoshiro256** state evolution, FNV-1a hashing, and Box-Muller Gaussian sampling.',
  definition: 'A deterministic seedable RNG stack: SplitMix64 (seeding), xoshiro256** (state evolution), FNV-1a (genetic hashing), Box-Muller (Gaussian).',
  problemSolved: 'Different OS, libm, or wall-clock must produce identical random outputs.',
  evidence: [
    { repo: 'paradigm-reference', file: 'spec/03-kernel.md' },
    { repo: 'canon-foundation', file: 'src/rng/deterministic.ts' }
  ],
  implementationStatus: 'complete',
  claimStatus: null,
  dependencies: ['GSPL-INV-0004'],
  conflicts: [],
  risks: ['Migration to a different PRNG family would break reproducibility of in-flight gseeds.'],
  disposition: 'ADOPT',
  targetSubsystem: 'kernel',
  createdAtPolicy: 'ADR-0001',
  schemaVersion: '1.0'
};
