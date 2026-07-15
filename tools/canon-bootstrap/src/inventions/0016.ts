import type { InventionEntry } from '../types.js';

export const GSPL_INV_0016: InventionEntry = {
  id: 'GSPL-INV-0016',
  canonicalName: '.gseed binary container format',
  aliases: ['GSED', 'gseed format', 'gseed container'],
  founderIntent: 'A gseed file begins with the four-byte magic GSED, followed by a header that records content hash, schema version, and lineage. The format is content-addressed: two gseeds with the same content body and lineage are byte-identical.',
  definition: 'Binary container for shipping and storing a Genome on disk.',
  problemSolved: 'A reproducible container format lets gseeds be checkpointed, shared, and reproduced byte-for-byte.',
  evidence: [{ repo: 'paradigm-reference', file: 'spec/06-gseed-format.md' }],
  implementationStatus: 'partial',
  claimStatus: null,
  dependencies: ['GSPL-INV-0001', 'GSPL-INV-0004'],
  conflicts: [],
  risks: ['Adding fields without bumping $gst version silently invalidates downstream readers.'],
  disposition: 'ADAPT',
  targetSubsystem: 'package-system',
  createdAtPolicy: 'ADR-0006',
  schemaVersion: '1.0'
};
