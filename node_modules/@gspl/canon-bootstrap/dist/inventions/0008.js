export const GSPL_INV_0008 = {
    id: 'GSPL-INV-0008',
    canonicalName: '26-keyword reserved language grammar',
    aliases: ['26 keywords', 'reserved words'],
    founderIntent: 'The Initial Inventory of 26 reserved GSPL keywords. Additions are conservative because keywords change source-code meaning. EXTENSIBLE per the EXTENSIBILITY PROTOCOL.',
    definition: 'Initial inventory of 26 reserved GSPL keywords: seed, breed, mutate, compose, evolve, grow, export, import, let, fn, if, else, match, for, while, return, true, false, null, type, trait, impl, where, gene, domain, signed.',
    problemSolved: 'A core language needs a stable, finite, parsimonious reserved-word set.',
    evidence: [
        { repo: 'paradigm-reference', file: 'spec/04-gspl-language.md' },
        { repo: 'canon-foundation', file: 'src/constants.ts' }
    ],
    implementationStatus: 'partial',
    claimStatus: null,
    dependencies: ['GSPL-INV-0001'],
    conflicts: [],
    risks: ['Adding keywords can silently break existing source code.'],
    disposition: 'ADAPT',
    targetSubsystem: 'language',
    createdAtPolicy: 'ADR-0004',
    schemaVersion: '1.0'
};
//# sourceMappingURL=0008.js.map