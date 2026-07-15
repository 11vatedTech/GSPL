/**
 * @gspl/compiler-core — GSPL Compiler Core
 *
 * 5-layer pipeline: Authoring → Canonical Seed → GSPL IR →
 * Deterministic Expansion Plan → Target Artifact Graph.
 *
 * Per Prompt 2 §4, §15.
 */
export type { CompilerContext, CompilerSession, PipelineStage, PipelineResult, SeedToIrResult, IrToPlanResult, PlanToArtifactResult, } from './pipeline.js';
export type { ExpansionPlan, ExpansionOperation, ExpansionDependency, ParallelGroup, CacheKey, RollbackBoundary, FailurePolicy, } from './expansion-plan.js';
export type { TargetArtifactGraph, ArtifactNode, ArtifactEdge, ArtifactKind, TargetEmitter, } from './artifact-graph.js';
export { createCompilerContext, runPipeline, stageAuthoringToSeed, stageSeedToIr, stageIrToPlan, stagePlanToArtifact, } from './pipeline.js';
export { createExpansionPlan, addOperation, validatePlan, } from './expansion-plan.js';
export { createArtifactGraph, addArtifact, emitArtifacts, } from './artifact-graph.js';
export { fixtureSoftwareArchitecture, fixtureInteractiveScene, fixtureMixedVideoGame, } from './fixtures.js';
export { reconstructSeedFromIr, verifyIndependentReconstruction } from './ir-reconstructor.js';
export type { IrReconstructionResult, ReconstructionContext } from './ir-reconstructor.js';
export { evaluateConstraint, authorizeEffects, enforceResourceBudgets, checkInvariants, verifyPipelineOutputs, checkConstraintSatisfaction, } from './semantic-verifier.js';
export type { ConstraintCheckResult, EffectAuthResult, BudgetCheckResult } from './semantic-verifier.js';
//# sourceMappingURL=index.d.ts.map