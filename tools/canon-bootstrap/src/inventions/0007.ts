import type { InventionEntry } from '../types.js';

export const GSPL_INV_0007: InventionEntry = {
  id: 'GSPL-INV-0007',
  canonicalName: 'Per-gene-type 5-operator suite',
  aliases: ['validate/mutate/crossover/distance/canonicalize'],
  founderIntent: 'Each gene type carries the same five canonical operators, satisfying the per-type property tests in spec/02. The 5-operator convention makes genetic composition closed under the inventory.',
  definition: 'Per-gene-type operator suite: validate, mutate, crossover, distance, canonicalize.',
  problemSolved: 'Genetic operations should compose uniformly without per-type special cases.',
  evidence: [{ repo: 'paradigm-reference', file: 'spec/02-gene-system.md' }],
  implementationStatus: 'partial',
  claimStatus: null,
  dependencies: ['GSPL-INV-0002', 'GSPL-INV-0003'],
  conflicts: [],
  risks: ['Per-type operators that do not satisfy the per-type property tests are flagged by ADR-0004.'],
  disposition: 'ADAPT',
  targetSubsystem: 'gene-system',
  createdAtPolicy: 'ADR-0004',
  schemaVersion: '1.0'
};
