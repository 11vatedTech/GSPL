/** Seed lifecycle operations per Prompt 2 §5.4 */

import type { CanonicalSeed } from './seed.js';

export type SeedLifecycleOperation =
  | SeedCreateOperation
  | SeedNormalizeOperation
  | SeedValidateOperation
  | SeedHashOperation
  | SeedDeriveOperation
  | SeedComposeOperation
  | SeedMergeOperation
  | SeedDiffOperation
  | SeedMigrateOperation;

export interface SeedCreateOperation {
  operation: 'create';
  seed: CanonicalSeed;
}

export interface SeedNormalizeOperation {
  operation: 'normalize';
  seed: CanonicalSeed;
}

export interface SeedValidateOperation {
  operation: 'validate';
  seed: CanonicalSeed;
  strict?: boolean;
}

export interface SeedHashOperation {
  operation: 'hash';
  seed: CanonicalSeed;
}

export interface SeedDeriveOperation {
  operation: 'derive' | 'fork' | 'specialize' | 'generalize' | 'clone';
  parent: CanonicalSeed;
  modifications: Partial<CanonicalSeed>;
}

export interface SeedComposeOperation {
  operation: 'compose';
  seeds: CanonicalSeed[];
  strategy: 'merge' | 'union' | 'overlay';
}

export interface SeedMergeOperation {
  operation: 'merge';
  base: CanonicalSeed;
  incoming: CanonicalSeed;
  strategy: 'conservative' | 'incoming-wins';
}

export interface SeedDiffOperation {
  operation: 'diff';
  a: CanonicalSeed;
  b: CanonicalSeed;
}

export interface SeedMigrateOperation {
  operation: 'migrate' | 'deprecate' | 'archive';
  seed: CanonicalSeed;
  targetSchemaVersion: string;
}
