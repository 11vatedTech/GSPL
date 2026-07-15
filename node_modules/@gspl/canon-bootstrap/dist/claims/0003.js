export const GSPL_CLAIM_0003 = {
    claimId: 'GSPL-CLAIM-0003',
    statement: 'Perfect universal cross-paradigm translation is REFUTED. Translation between programming paradigms loses structural meaning because paradigms encode non-equivalent semantic invariants. GSPL supports GRADUATED translation fidelity (RC-1..RC-8) but not perfect translation.',
    status: 'REFUTED',
    scope: 'Universal; applies to any candidate perfect-translation theorem between Turing-complete paradigms. The graduated-fidelity claim stands.',
    conditions: ['Both paradigms are Turing-complete'],
    evidence: [
        { repo: 'canon-foundation', file: 'docs/canon/GSPL_TRANSLATION_BRIDGE_MODEL.md' }
    ],
    counterEvidence: [
        { repo: 'paradigm-reference', file: 'spec/04-gspl-language.md' }
    ],
    verificationMethod: 'Cite Felleisen (1991) on the expressive power of programming languages; argue structural non-equivalence of paradigms.',
    falsificationCriteria: [
        'A constructive proof of perfect translation between two paradigms is published',
        'Two paradigms are shown to differ only in notation, not in semantics'
    ],
    relatedInventions: ['GSPL-INV-0016'],
    lastReviewed: '2026-07-14'
};
//# sourceMappingURL=0003.js.map