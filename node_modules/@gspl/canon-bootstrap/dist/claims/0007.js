export const GSPL_CLAIM_0007 = {
    claimId: 'GSPL-CLAIM-0007',
    statement: 'Cross-architecture determinism: a GSPL program expanded identically on two architectures produces byte-identical canonical outputs. Limited to architectures that implement the SplitMix64 + xoshiro256** + FNV-1a + Box-Muller stack without substitution.',
    status: 'RESEARCH_REQUIRED',
    scope: 'Architectures that implement the canon-foundation determinism stack without algorithmic substitution.',
    conditions: [
        'Same $gst schema version',
        'Same knowledge version',
        'Same input seed',
        'Identical determinism stack'
    ],
    evidence: [
        { repo: 'paradigm-reference', file: 'spec/07-determinism.md' },
        { repo: 'canon-foundation', file: 'src/rng/deterministic.ts' }
    ],
    counterEvidence: [],
    verificationMethod: 'Run an identical seed expansion on two architectures; assert hash match.',
    falsificationCriteria: [
        'Two architectures produce different hashes for the same input',
        'A non-canonical RNG introduces divergence'
    ],
    relatedInventions: ['GSPL-INV-0003'],
    lastReviewed: '2026-07-14'
};
//# sourceMappingURL=0007.js.map