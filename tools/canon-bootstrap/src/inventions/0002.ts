import type { InventionEntry } from '../types.js';

export const GSPL_INV_0002: InventionEntry = {
  id: 'GSPL-INV-0002',
  canonicalName: 'Initial 17-type gene inventory',
  aliases: ['17 gene types', 'INITIAL_STANDARD_LIBRARY_INVENTORY'],
  founderIntent: 'The 17 gene types are the INITIAL STANDARD LIBRARY INVENTORY empirically derived by implementing 26 domain engines under spec/02. They are EXTENSIBLE per the EXTENSIBILITY PROTOCOL.',
  definition: 'Empirically-derived initial inventory of 17 gene types: scalar, categorical, vector, expression, struct, array, graph, topology, temporal, regulatory, field, symbolic, quantum, gematria, resonance, dimensional, sovereignty.',
  problemSolved: 'Composability requires a finite, type-tagged set of gene primitives with per-type (validate, mutate, crossover, distance, canonicalize) operators.',
  evidence: [
    { repo: 'paradigm-reference', file: 'spec/02-gene-system.md' },
    { repo: 'canon-foundation', file: 'src/types/gene-types.ts' },
    { repo: 'canon-foundation', file: 'src/constants.ts' }
  ],
  implementationStatus: 'complete',
  claimStatus: null,
  dependencies: ['GSPL-INV-0001'],
  conflicts: [],
  risks: ['Reading 17 as a closed set is denied by ADR-0004.'],
  disposition: 'ADAPT',
  targetSubsystem: 'gene-system',
  createdAtPolicy: 'ADR-0004',
  schemaVersion: '1.0'
};
