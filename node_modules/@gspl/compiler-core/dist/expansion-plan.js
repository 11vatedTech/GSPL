/** Deterministic expansion plan — Prompt 2 §4.4 */
export function createExpansionPlan(seedIdentity, ctx) {
    return {
        schema: 'gspl.expansion-plan',
        schemaVersion: '1.0',
        seedIdentity,
        operations: [],
        parallelGroups: [],
        cacheKeys: [],
        rollbackBoundaries: [],
        failurePolicy: { onError: 'halt', maxRetries: 0, retryDelayMs: 0 },
        verificationSteps: [],
        resourceBudget: { maxTimeMs: ctx.limits.maxDocumentSize > 0 ? 300_000 : 60_000, maxMemoryBytes: 512 * 1024 * 1024 },
    };
}
export function addOperation(plan, op) {
    if (plan.operations.some(o => o.id === op.id)) {
        throw new Error('Duplicate operation: ' + op.id);
    }
    plan.operations.push(op);
    return plan;
}
export function validatePlan(plan) {
    const errors = [];
    const ids = new Set(plan.operations.map(o => o.id));
    for (const op of plan.operations) {
        for (const dep of op.dependencies) {
            if (!ids.has(dep.operationId)) {
                errors.push('Operation ' + op.id + ' depends on unknown: ' + dep.operationId);
            }
        }
    }
    for (const pg of plan.parallelGroups) {
        for (const oid of pg.operations) {
            if (!ids.has(oid)) {
                errors.push('Parallel group ' + pg.id + ' references unknown operation: ' + oid);
            }
        }
    }
    return { ok: errors.length === 0, errors };
}
//# sourceMappingURL=expansion-plan.js.map