import type { Claim } from '../types.js';

export const GSPL_CLAIM_0005: Claim = {
  claimId: 'GSPL-CLAIM-0005',
  statement: 'The Canonical multi-projection model allows a single seed to be projected into multiple target architectures through the `struct`, `graph`, `topology`, and `field` gene-combinator types. The mechanism is DESIGNED but not yet production-validated across architectures.',
  status: 'THEORETICAL',
  scope: 'Within the design contract of the 17 initial gene types; targets JavaScript and WGSL-class architectures.',
  conditions: [
    'A seed uses the canonical combinator gene types',
    'A canonical knowledge version is loaded',
    'Targets are within the documented scope'
  ],
  evidence: [
    { repo: 'paradigm-reference', file: 'spec/02-gene-system.md' }
  ],
  counterEvidence: [],
  verificationMethod: 'Build a 3-target projection test in Prompt 3: parse, lower, and hash against three independent Hash implementations.',
  falsificationCriteria: [
    'Two projections of the same seed against the same target do not produce equivalent artifacts',
    'A combinator type fails the per-type property tests'
  ],
  relatedInventions: ['GSPL-INV-0007', 'GSPL-INV-0012'],
  lastReviewed: '2026-07-14'
};
