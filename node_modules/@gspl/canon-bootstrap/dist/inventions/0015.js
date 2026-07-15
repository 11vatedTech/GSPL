export const GSPL_INV_0015 = {
    id: 'GSPL-INV-0015',
    canonicalName: '8 algebraic-effect system (research)',
    aliases: ['effects', 'effect system'],
    founderIntent: 'Eight algebraic effects are planned: spawn, transform, observe, compose, dispose, audit, sign, broadcast. The cycle framework stubs each effect but the algebraic semantics remain research-only.',
    definition: 'Eight algebraic effects: spawn, transform, observe, compose, dispose, audit, sign, broadcast. Algebraic semantics are RESEARCH.',
    problemSolved: 'Programs need a stable, composable vocabulary for runtime side-effects without arbitrary I/O.',
    evidence: [{ repo: 'paradigm-reference', file: 'spec/03-kernel.md' }],
    implementationStatus: 'spec-only',
    claimStatus: null,
    dependencies: ['GSPL-INV-0014'],
    conflicts: [],
    risks: ['Algebraic semantics not yet pinned; effect-channel drift is possible.'],
    disposition: 'RESEARCH',
    targetSubsystem: 'runtime',
    createdAtPolicy: 'ADR-0006',
    schemaVersion: '1.0'
};
//# sourceMappingURL=0015.js.map