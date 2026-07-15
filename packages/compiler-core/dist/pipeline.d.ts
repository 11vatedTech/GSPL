/** 5-layer pipeline — Prompt 2 §4, §8-13 */
import type { CanonicalSeed } from '@gspl/seed-format';
import type { GsplIrGraph, IrNormalizedGraph, Diagnostic, ProvenanceRecord } from '@gspl/ir-model';
import type { GeneTypeRegistry } from '@gspl/gene-protocol';
import type { ExpansionPlan } from './expansion-plan.js';
import type { TargetArtifactGraph } from './artifact-graph.js';
export interface CompilerContext {
    canonVersion: string;
    compilerVersion: string;
    schemaVersions: Record<string, string>;
    limits: ResourceLimits;
    geneRegistry: GeneTypeRegistry;
}
/** Deterministic compilation identity — no wall-clock, no random */
export interface CompilationIdentity {
    seedContentId: string;
    compilerVersion: string;
    canonVersion: string;
    packages: string[];
}
export declare function createCompilationIdentity(seedContentId: string, compilerVersion: string, canonVersion: string): CompilationIdentity;
export interface ResourceLimits {
    maxDocumentSize: number;
    maxNodeCount: number;
    maxEdgeCount: number;
    maxNesting: number;
    maxDiagnosticCount: number;
    maxExpansionOperations: number;
    maxRuleDepth: number;
    maxReferencedPackageCount: number;
}
export declare const DEFAULT_LIMITS: ResourceLimits;
export interface CompilerSession {
    context: CompilerContext;
    seed: CanonicalSeed;
    normalizedSeed?: CanonicalSeed;
    ir?: GsplIrGraph;
    normalizedIr?: IrNormalizedGraph;
    plan?: ExpansionPlan;
    artifactGraph?: TargetArtifactGraph;
    diagnostics: Diagnostic[];
    provenance: ProvenanceRecord[];
}
export type PipelineStage = 'authoring-to-seed' | 'seed-to-ir' | 'ir-to-plan' | 'plan-to-artifact' | 'verify';
export interface PipelineResult {
    ok: boolean;
    session: CompilerSession;
    stageResults: StageResult[];
}
export interface StageResult {
    stage: PipelineStage;
    ok: boolean;
    durationMs: number;
    errorCount: number;
    warningCount: number;
}
export interface SeedToIrResult {
    ir: GsplIrGraph;
    diagnostics: Diagnostic[];
    provenance: ProvenanceRecord[];
}
export interface IrToPlanResult {
    plan: ExpansionPlan;
    diagnostics: Diagnostic[];
}
export interface PlanToArtifactResult {
    artifactGraph: TargetArtifactGraph;
    diagnostics: Diagnostic[];
}
export declare function createCompilerContext(overrides?: Partial<CompilerContext>): CompilerContext;
export declare function runPipeline(ctx: CompilerContext, seed: CanonicalSeed): PipelineResult;
export declare function stageAuthoringToSeed(session: CompilerSession): void;
export declare function stageSeedToIr(session: CompilerSession): SeedToIrResult;
export declare function stageIrToPlan(session: CompilerSession): IrToPlanResult;
export declare function stagePlanToArtifact(session: CompilerSession): PlanToArtifactResult;
export declare function verifyPipeline(session: CompilerSession): Diagnostic[];
//# sourceMappingURL=pipeline.d.ts.map