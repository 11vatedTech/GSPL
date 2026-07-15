export const GSPL_CLAIM_0001 = {
    claimId: 'GSPL-CLAIM-0001',
    statement: 'The Core GSPL hypothesis is provisionally viable: supported by foundational implementation, not yet proven by end-to-end program reconstruction. Promotion to PROVEN requires seed-to-codebase reconstruction, deterministic recompilation, nontrivial architecture synthesis, behavioral equivalence, cross-language projection, test preservation, and reproducibility from independently repeated builds.',
    status: 'PROTOTYPED',
    scope: 'Within packages/canon-foundation and the supplied reference architectures only; does not yet include cross-language, end-to-end seed-to-artifact tests for arbitrary programs.',
    conditions: [
        'Same $gst schema version (currently 1.0)',
        'Same knowledge version as resolved at run time',
        'Compatible with an established 8-phase tick cycle'
    ],
    evidence: [
        { repo: 'canon-foundation', file: 'packages/canon-foundation/src/constants.ts' },
        { repo: 'paradigm-reference', file: 'spec/07-determinism.md' }
    ],
    counterEvidence: [
        { repo: 'paradigm-reference', file: 'spec/04-gspl-language.md' }
    ],
    verificationMethod: 'Run npm test in packages/canon-foundation; cross-check two independent seed expansions produce byte-identical canonical hashes (Prompts 2-3 deliver tests).',
    falsificationCriteria: [
        'Two independent builds of the same seed produce different hashes',
        'A canonical seed cannot be re-derived from its program output',
        'Cross-language projection diverges from the canonical reference output'
    ],
    relatedInventions: ['GSPL-INV-0001', 'GSPL-INV-0014'],
    lastReviewed: '2026-07-14'
};
//# sourceMappingURL=0001.js.map