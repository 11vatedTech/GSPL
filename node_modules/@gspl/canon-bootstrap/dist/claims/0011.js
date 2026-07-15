export const GSPL_CLAIM_0011 = {
    claimId: 'GSPL-CLAIM-0011',
    statement: 'Test suites round-trip through compilation: tests written canonically survive AST interpretation, codegen, and re-interpretation with output equivalent to the canonical form. Currently PARTIALLY_IMPLEMENTED: round-tripping is verified for the gene-types property suite but not for arbitrary hand-written tests.',
    status: 'PARTIALLY_IMPLEMENTED',
    scope: 'Within gene-types property suite and determinism tests; broader coverage is pending.',
    conditions: [
        'Tests are written in canonical AST or higher',
        'Compile and interpret targets are within the canon',
        'No external IO is performed during the test'
    ],
    evidence: [
        { repo: 'canon-foundation', file: 'packages/canon-foundation/test/gene-types.test.ts' }
    ],
    counterEvidence: [],
    verificationMethod: 'Run the canonical tests and the canonical-compiled equivalents; assert pass counts and output equivalence.',
    falsificationCriteria: [
        'A round-tripped test produces different output than the canonical version',
        'Test pass count changes after round-tripping'
    ],
    relatedInventions: ['GSPL-INV-0011', 'GSPL-INV-0012', 'GSPL-INV-0020'],
    lastReviewed: '2026-07-14'
};
//# sourceMappingURL=0011.js.map