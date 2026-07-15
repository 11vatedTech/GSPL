import type { InventionEntry } from '../types.js';

export const GSPL_INV_0017: InventionEntry = {
  id: 'GSPL-INV-0017',
  canonicalName: 'ECDSA P-256 + RFC 6979 sovereignty',
  aliases: ['sovereignty', 'signing key'],
  founderIntent: 'Sovereignty is established by an ECDSA P-256 keypair whose verified signatures cover gseed lineage and a SHA-256 content root. Signatures are deterministic per RFC 6979 so different signatories produce identical signatures over the same input.',
  definition: 'ECDSA P-256 signatures with deterministic RFC 6979 nonces over the SHA-256 content root of a gseed lineage.',
  problemSolved: 'Programs must attest authorship and lineage integrity across hosts, in a universally portable key format.',
  evidence: [{ repo: 'paradigm-reference', file: 'spec/05-sovereignty.md' }],
  implementationStatus: 'partial',
  claimStatus: null,
  dependencies: ['GSPL-INV-0004', 'GSPL-INV-0005'],
  conflicts: [],
  risks: ['Non-deterministic nonces break reproducibility. ADHOC crypto is forbidden by ADR-0001.'],
  disposition: 'ADOPT',
  targetSubsystem: 'canon-governance',
  createdAtPolicy: 'ADR-0001',
  schemaVersion: '1.0'
};
