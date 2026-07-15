/** Deterministic expansion plan — Prompt 2 §4.4 */
import type { CompilerContext } from './pipeline.js';
export interface ExpansionPlan {
    schema: 'gspl.expansion-plan';
    schemaVersion: string;
    seedIdentity: string;
    operations: ExpansionOperation[];
    parallelGroups: ParallelGroup[];
    cacheKeys: CacheKey[];
    rollbackBoundaries: RollbackBoundary[];
    failurePolicy: FailurePolicy;
    verificationSteps: VerificationStep[];
    resourceBudget: ResourceBudget;
    /** Operational audit timestamp — NOT part of canonical output */
    generatedAt?: string;
}
export interface ExpansionOperation {
    id: string;
    type: string;
    description: string;
    inputs: string[];
    outputs: string[];
    dependencies: ExpansionDependency[];
    deterministic: boolean;
    estimatedTimeMs?: number;
    estimatedMemoryBytes?: number;
}
export interface ExpansionDependency {
    operationId: string;
    required: boolean;
    inputMappings: Record<string, string>;
}
export interface ParallelGroup {
    id: string;
    operations: string[];
    maxConcurrency: number;
}
export interface CacheKey {
    operationId: string;
    key: string;
    inputHashes: string[];
}
export interface RollbackBoundary {
    id: string;
    afterOperations: string[];
    description: string;
}
export interface FailurePolicy {
    onError: 'halt' | 'skip' | 'degrade';
    maxRetries: number;
    retryDelayMs: number;
}
export interface VerificationStep {
    id: string;
    operationId: string;
    check: string;
    required: boolean;
}
export interface ResourceBudget {
    maxTimeMs: number;
    maxMemoryBytes: number;
}
export declare function createExpansionPlan(seedIdentity: string, ctx: CompilerContext): ExpansionPlan;
export declare function addOperation(plan: ExpansionPlan, op: ExpansionOperation): ExpansionPlan;
export declare function validatePlan(plan: ExpansionPlan): {
    ok: boolean;
    errors: string[];
};
//# sourceMappingURL=expansion-plan.d.ts.map