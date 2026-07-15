import type { InventionEntry } from '../types.js';

export const GSPL_INV_0006: InventionEntry = {
  id: 'GSPL-INV-0006',
  canonicalName: 'Lineage block',
  aliases: ['d-lineage', 'lineage tracking'],
  founderIntent: 'Every GSPL seed carries a $lineage block recording the operation that produced it, the parent gseeds, and the generation number. The lineage timestamp is deliberately normalized out of canonical hashes because timestamps would break reproducibility.',
  definition: 'The $lineage field of a Genome: operation, parents, generation, optional timestamp.',
  problemSolved: 'Reconstructing the history of a seed requires every gseed to know how it was produced.',
  evidence: [
    { repo: 'paradigm-reference', file: 'spec/01-universal-seed.md' },
    { repo: 'canon-foundation', file: 'src/types/universal-seed.ts' }
  ],
  implementationStatus: 'complete',
  claimStatus: null,
  dependencies: ['GSPL-INV-0005'],
  conflicts: [],
  risks: ['External tooling often mutates without writing a new $lineage.'],
  disposition: 'ADOPT',
  targetSubsystem: 'kernel',
  createdAtPolicy: 'ADR-0001',
  schemaVersion: '1.0'
};
