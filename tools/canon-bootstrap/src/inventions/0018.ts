import type { InventionEntry } from '../types.js';

export const GSPL_INV_0018: InventionEntry = {
  id: 'GSPL-INV-0018',
  canonicalName: 'Seven-axis structural contract',
  aliases: ['SEVEN_AXES', '7-axis discipline'],
  founderIntent: 'Seven structural axes that every GSPL surface satisfies: signed, typed, lineage-tracked, graph-structured, confidence-bearing, rollback-able, differentiable. Dropping any axis breaks the Next-Axis claim of the substrate.',
  definition: 'Seven structural axes: signed, typed, lineage-tracked, graph-structured, confidence-bearing, rollback-able, differentiable.',
  problemSolved: 'Without a structural contract, every GSPL output shape drifts; surfaces diverge.',
  evidence: [
    { repo: 'canon-foundation', file: 'src/constants.ts' }
  ],
  implementationStatus: 'partial',
  claimStatus: null,
  dependencies: ['GSPL-INV-0017'],
  conflicts: [],
  risks: ['Adding an axis would be a major canon change.'],
  disposition: 'ADOPT',
  targetSubsystem: 'canon-governance',
  createdAtPolicy: 'ADR-0006',
  schemaVersion: '1.0'
};
