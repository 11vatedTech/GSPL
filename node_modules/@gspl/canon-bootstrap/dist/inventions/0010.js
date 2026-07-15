export const GSPL_INV_0010 = {
    id: 'GSPL-INV-0010',
    canonicalName: 'Typed AST (25+ nodes)',
    aliases: ['GSPL AST'],
    founderIntent: 'A typed AST with at least 25 node kinds forms the substrate of language interpretation and codegen.',
    definition: 'Typed Abstract Syntax Tree with at least 25 node kinds as defined in spec/04.',
    problemSolved: 'A typed intermediate shape enables both interpretation and codegen, with type-aware diagnostics.',
    evidence: [{ repo: 'paradigm-reference', file: 'spec/04-gspl-language.md' }],
    implementationStatus: 'partial',
    claimStatus: null,
    dependencies: ['GSPL-INV-0009'],
    conflicts: [],
    risks: ['AST drift between interpreters and codegen produces non-deterministic outputs.'],
    disposition: 'ADOPT',
    targetSubsystem: 'compiler',
    createdAtPolicy: 'ADR-0005',
    schemaVersion: '1.0'
};
//# sourceMappingURL=0010.js.map