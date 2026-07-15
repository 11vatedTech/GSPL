export const GSPL_INV_0005 = {
    id: 'GSPL-INV-0005',
    canonicalName: 'JCS RFC 8785 canonicalization',
    aliases: ['JCS', 'RFC 8785', 'canonical JSON'],
    founderIntent: 'JSON Canonicalization Scheme (RFC 8785) is the substrate of GSPL content identity. The implementation follows the spec exactly with shortest-roundtrip number formatting, lex-sorted object keys, and UTF-16 surrogate pairs preserved.',
    definition: 'RFC 8785 JSON Canonicalization Scheme.',
    problemSolved: 'Two equivalent JSON documents must hash to the same SHA-256 to be canonically equivalent.',
    evidence: [
        { repo: 'paradigm-reference', file: 'spec/05-sovereignty.md' },
        { repo: 'canon-foundation', file: 'src/canonicalize/jcs.ts' }
    ],
    implementationStatus: 'complete',
    claimStatus: null,
    dependencies: [],
    conflicts: [],
    risks: ['Library drift if a third-party JCS implementation differs from RFC 8785 in edge cases.'],
    disposition: 'ADOPT',
    targetSubsystem: 'kernel',
    createdAtPolicy: 'ADR-0001',
    schemaVersion: '1.0'
};
//# sourceMappingURL=0005.js.map