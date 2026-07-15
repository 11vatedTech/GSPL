export const GSPL_INV_0001 = {
    id: 'GSPL-INV-0001',
    canonicalName: 'Genome canonical seed model',
    aliases: ['UniversalSeed', 'gseed genome', 'Genome'],
    founderIntent: 'A typed Genome is the canonical form of a GSPL seed. It carries $gst (schema version), $domain (one of 26), $lineage (operation + parents + generation + optional timestamp), and a genes map of named Gene values keyed by gene name.',
    definition: 'A typed Genome is the canonical form of a GSPL seed: $gst, $domain, $lineage, and a genes map of named Gene values.',
    problemSolved: 'Programs need a stable, addressable, hashable canonical representation.',
    evidence: [
        { repo: 'paradigm-reference', file: 'spec/01-universal-seed.md' },
        { repo: 'canon-foundation', file: 'src/types/universal-seed.ts' }
    ],
    implementationStatus: 'partial',
    claimStatus: null,
    dependencies: ['GSPL-INV-0004', 'GSPL-INV-0005', 'GSPL-INV-0006'],
    conflicts: [],
    risks: [
        'Schema drift if $gst version is bumped without a corresponding ADR',
        'Ambiguity if gene names are duplicated across the 17-type inventory'
    ],
    disposition: 'ADOPT',
    targetSubsystem: 'kernel',
    createdAtPolicy: 'ADR-0001',
    schemaVersion: '1.0'
};
//# sourceMappingURL=0001.js.map