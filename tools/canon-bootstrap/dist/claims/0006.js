export const GSPL_CLAIM_0006 = {
    claimId: 'GSPL-CLAIM-0006',
    statement: 'The initial 17-gene inventory is IRREDUCIBLE: removing any one of the 17 gene types loses expressiveness that cannot be recovered by composing the rest. This claim is empirically motivated in spec/02 but is NOT proven; it remains RESEARCH_REQUIRED.',
    status: 'RESEARCH_REQUIRED',
    scope: 'Universe of canonical gene types as defined in spec/02; the claim is open to hostile review.',
    conditions: [
        'Per-type property tests are exhaustive',
        'Composition is closed under the 5-operator suite',
        'No third-party gene extension is implicit'
    ],
    evidence: [
        { repo: 'paradigm-reference', file: 'spec/02-gene-system.md' }
    ],
    counterEvidence: [],
    verificationMethod: 'Hotile review: identify a candidate gene type T and attempt to emulate it by composition of the other 16; if any composition reconstructs T, the claim is falsified.',
    falsificationCriteria: [
        'A gene type T can be emulated by composition of other types',
        'A counterexample gene-type removal is shown to be recoverable'
    ],
    relatedInventions: ['GSPL-INV-0002', 'GSPL-INV-0007'],
    lastReviewed: '2026-07-14'
};
//# sourceMappingURL=0006.js.map