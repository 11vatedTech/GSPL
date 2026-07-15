import type { Claim } from '../types.js';

export const GSPL_CLAIM_0004: Claim = {
  claimId: 'GSPL-CLAIM-0004',
  statement: 'Seed-first program reconstruction: given a GSPL seed, the canonical program it represents can be reconstructed (artefact and intermediate state both derivable from the seed).',
  status: 'PARTIALLY_IMPLEMENTED',
  scope: 'For seeds expanded by the canonical canon-foundation interpreter and codegen pipeline over a closed set of canonical gene types.',
  conditions: [
    'Seed in scope of canonical $gst schema',
    'Knowledge version matches the interpreter build',
    'No external state leaks'
  ],
  evidence: [
    { repo: 'canon-foundation', file: 'packages/canon-foundation/src/types/universal-seed.ts' },
    { repo: 'canon-foundation', file: 'packages/canon-foundation/src/tick/cycle.ts' }
  ],
  counterEvidence: [],
  verificationMethod: 'Run the canonical interpreter twice with the same seed + knowledge version and assert output equivalence via SHA-256 (Prompt 2 delivers the test).',
  falsificationCriteria: [
    'Two runs of the same seed produce different outputs',
    'The reconstructed program is observably different from the original'
  ],
  relatedInventions: ['GSPL-INV-0001', 'GSPL-INV-0011', 'GSPL-INV-0014'],
  lastReviewed: '2026-07-14'
};
