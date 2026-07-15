/**
 * @gspl/seed-format — Canonical GSPL Seed Specification
 *
 * Defines the normative seed contract, package contracts (context, knowledge,
 * rule), seed lifecycle operations, reproducibility tuple, and output
 * equivalence levels.
 *
 * Per Prompt 2 §4-5.
 */

export type {
  CanonicalSeed,
  SeedIdentity,
  SeedNamespace,
  DomainProfile,
  DeclaredIntent,
  TypedPayload,
  SeedConstraints,
  SeedDependencies,
  ContextReference,
  KnowledgeReference,
  RuleSetReference,
  TargetContract,
  DeterministicEntropyDeclaration,
  SeedLineage,
  SeedProvenance,
  ResourceBudget,
  EffectPermissions,
  HashMaterial,
  NonHashMetadata,
} from './seed.js';

export type {
  PackageContract,
  ContextPackage,
  KnowledgePackage,
  RulePackage,
  PackageIdentity,
  PackageDependency,
  PackageProvenance,
} from './packages.js';

export type {
  ReproducibilityTuple,
  OutputEquivalenceLevel,
  OutputEquivalence,
} from './reproducibility.js';

export type {
  SeedLifecycleOperation,
  SeedCreateOperation,
  SeedNormalizeOperation,
  SeedValidateOperation,
  SeedHashOperation,
  SeedDeriveOperation,
  SeedComposeOperation,
  SeedMergeOperation,
  SeedDiffOperation,
  SeedMigrateOperation,
} from './lifecycle.js';

export {
  OUTPUT_EQUIVALENCE_LEVELS,
  compareEquivalence,
} from './reproducibility.js';

export {
  makePrimordialSeed,
  normalizeSeed,
  hashMaterialFromSeed,
  canonicalizeSeed,
  extractCanonicalHashMaterial,
  computeSeedHash,
  verifySeedHash,
  HASH_POLICY,
  isHashedField,
} from './seed-ops.js';
