import type { Claim } from '../types.js';

export const GSPL_CLAIM_0012: Claim = {
  claimId: 'GSPL-CLAIM-0012',
  statement: 'Independently repeated builds of the same seed produce byte-identical canonical gseed content. The canon-foundation determinism stack supports this for in-process runs; cross-host reproducibility (e.g. Windows + Linux) is PROTOTYPED via the deterministic RNG stack but full coverage tests are pending.',
  status: 'PROTOTYPED',
  scope: 'Within the canon-foundation determinism stack. Cross-architecture coverage is RESEARCH_REQUIRED in GSPL-CLAIM-0007.',
  conditions: [
    'Same build inputs (seed, knowledge version)',
    'Same canon-foundation determinism stack',
    'No wall-clock-dependent inputs'
  ],
  evidence: [
    { repo: 'canon-foundation', file: 'src/rng/deterministic.ts' },
    { repo: 'canon-foundation', file: 'src/hash/sha256.ts' }
  ],
  counterEvidence: [],
  verificationMethod: 'Run `npm run build` twice; assert byte-identical artifacts.',
  falsificationCriteria: [
    'Two repeatable builds produce different artifacts',
    'A wall-clock input leaks into the canonical encoding'
  ],
  relatedInventions: ['GSPL-INV-0003', 'GSPL-INV-0004'],
  lastReviewed: '2026-07-14'
};
