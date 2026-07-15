import type { Claim } from '../types.js';

export const GSPL_CLAIM_0009: Claim = {
  claimId: 'GSPL-CLAIM-0009',
  statement: 'The provenance checker has validated the actual canonical registries (inventions.json, sources.json, claims.json, architecture-decisions.json) end-to-end and produced a deterministic validation report. Status is IMPLEMENTED only after this end-to-end execution succeeds.',
  status: 'IMPLEMENTED',
  scope: 'Within packages/provenance-checker and the bootstrap pipeline.',
  conditions: [
    'Inventions + sources + claims + architecture-decisions JSON exist',
    'Tool can resolve references and detect orphans',
    'Tool exits 0 on PASS, 2 on FAIL'
  ],
  evidence: [
    { repo: 'canon-foundation', file: 'canon/provenance/inventions.json' },
    { repo: 'canon-foundation', file: 'canon/provenance/sources.json' }
  ],
  counterEvidence: [],
  verificationMethod: 'Run `npm run check:provenance` and inspect the report; assert zero errors.',
  falsificationCriteria: [
    'A malformed invention ID is accepted',
    'Orphan inventions pass undetected',
    'Report is non-deterministic across reruns'
  ],
  relatedInventions: ['GSPL-INV-0020'],
  lastReviewed: '2026-07-14'
};
