export const GSPL_INV_0012 = {
    id: 'GSPL-INV-0012',
    canonicalName: 'AST to JavaScript compiler (codegen)',
    aliases: ['codegen', 'GSPL to JS'],
    founderIntent: 'A codegen pipeline that lowers a typed AST to ES2020 JavaScript for cross-language projection. Currently uses the typed AST as the de-facto IR.',
    definition: 'AST to ES2020 codegen pipeline emitting JavaScript modules.',
    problemSolved: 'Cross-language projection of GSPL programs to standard JavaScript runtimes.',
    evidence: [{ repo: 'paradigm-reference', file: 'spec/04-gspl-language.md' }],
    implementationStatus: 'partial',
    claimStatus: null,
    dependencies: ['GSPL-INV-0010'],
    conflicts: ['GSPL-INV-0013'],
    risks: ['If a canonical IR is adopted, codegen must be retrofitted to consume it.'],
    disposition: 'ADAPT',
    targetSubsystem: 'compiler',
    createdAtPolicy: 'ADR-0008',
    schemaVersion: '1.0'
};
//# sourceMappingURL=0012.js.map