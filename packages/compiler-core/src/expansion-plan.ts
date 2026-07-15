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

export function createExpansionPlan(seedIdentity: string, ctx: CompilerContext): ExpansionPlan {
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

export function addOperation(plan: ExpansionPlan, op: ExpansionOperation): ExpansionPlan {
  if (plan.operations.some(o => o.id === op.id)) {
    throw new Error('Duplicate operation: ' + op.id);
  }
  plan.operations.push(op);
  return plan;
}

export function validatePlan(plan: ExpansionPlan): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
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
