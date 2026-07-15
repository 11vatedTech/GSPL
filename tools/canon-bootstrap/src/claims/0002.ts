import type { Claim } from '../types.js';

export const GSPL_CLAIM_0002: Claim = {
  claimId: 'GSPL-CLAIM-0002',
  statement: 'Universal arbitrary-data compression (one shorter description for every input) is REFUTED.',
  status: 'REFUTED',
  scope: 'Universal; applies to all candidate compression schemes including any that GSPL might propose. Defended via Kolmogorov complexity (1965).',
  conditions: ['No special-purpose or lossy compression attempted.'],
  evidence: [
    { repo: 'paradigm-reference', file: 'spec/01-universal-seed.md' }
  ],
  counterEvidence: [
    { repo: 'paradigm-reference', file: 'spec/07-determinism.md' }
  ],
  verificationMethod: 'Cite Kolmogorov (1965) and standard textbooks on algorithmic information theory; no implementation necessary.',
  falsificationCriteria: [
    'A constructive universal compressor is published with formal correctness proof',
    'Kolmogorov-incompressible strings are shown to be compressible in practice'
  ],
  relatedInventions: ['GSPL-INV-0005'],
  lastReviewed: '2026-07-14'
};
