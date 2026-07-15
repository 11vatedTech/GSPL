/**
 * @gspl/seed-format — Canonical GSPL Seed Specification
 *
 * Defines the normative seed contract, package contracts (context, knowledge,
 * rule), seed lifecycle operations, reproducibility tuple, and output
 * equivalence levels.
 *
 * Per Prompt 2 §4-5.
 */
export { OUTPUT_EQUIVALENCE_LEVELS, compareEquivalence, } from './reproducibility.js';
export { makePrimordialSeed, normalizeSeed, hashMaterialFromSeed, canonicalizeSeed, extractCanonicalHashMaterial, computeSeedHash, verifySeedHash, HASH_POLICY, isHashedField, } from './seed-ops.js';
//# sourceMappingURL=index.js.map