import type { InventionEntry } from '../types.js';

export const GSPL_INV_0004: InventionEntry = {
  id: 'GSPL-INV-0004',
  canonicalName: 'SHA-256 content addressing',
  aliases: ['SHA-256', 'FIPS 180-4'],
  founderIntent: 'All content identifiers in GSPL sovereignty are SHA-256 of the JCS-canonical encoding of the object. The implementation is pure JS with NIST FIPS 180-4 test vectors pinned.',
  definition: 'The SHA-256 cryptographic hash function as defined in FIPS 180-4.',
  problemSolved: 'GSPL sovereignty requires a globally stable, collision-resistant content identifier.',
  evidence: [
    { repo: 'paradigm-reference', file: 'spec/05-sovereignty.md' },
    { repo: 'canon-foundation', file: 'src/hash/sha256.ts' }
  ],
  implementationStatus: 'complete',
  claimStatus: null,
  dependencies: [],
  conflicts: [],
  risks: ['Quantum attacks on SHA-256 are not a near-term threat but are noted (ADR-0001).'],
  disposition: 'ADOPT',
  targetSubsystem: 'kernel',
  createdAtPolicy: 'ADR-0001',
  schemaVersion: '1.0'
};
