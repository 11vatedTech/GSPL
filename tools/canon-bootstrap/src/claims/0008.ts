import type { Claim } from '../types.js';

export const GSPL_CLAIM_0008: Claim = {
  claimId: 'GSPL-CLAIM-0008',
  statement: 'GSPL canonical types (Genome, Assertion, Lineage, Authorization) emit JCS-canonical encoding of their structure and SHA-256 the encoding to a stable identifier.',
  status: 'IMPLEMENTED',
  scope: 'Within packages/canon-foundation.',
  conditions: ['Types are encoded per RFC 8785 JCS exactly.', 'Top-level field ordering follows the GSPL convention.'],
  evidence: [
    { repo: 'canon-foundation', file: 'src/canonicalize/jcs.ts' },
    { repo: 'canon-foundation', file: 'src/hash/sha256.ts' }
  ],
  counterEvidence: [],
  verificationMethod: 'NIST FIPS 180-4 vectors and RFC 8785 test vectors pinned in `src/canonicalize/jcs.test.ts`.',
  falsificationCriteria: [
    'A NIST test vector fails',
    'Two equivalent inputs produce different JCS canonical encodings'
  ],
  relatedInventions: ['GSPL-INV-0005', 'GSPL-INV-0004'],
  lastReviewed: '2026-07-14'
};
