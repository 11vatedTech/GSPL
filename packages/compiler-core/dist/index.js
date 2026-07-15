/**
 * @gspl/compiler-core — GSPL Compiler Core
 *
 * 5-layer pipeline: Authoring → Canonical Seed → GSPL IR →
 * Deterministic Expansion Plan → Target Artifact Graph.
 *
 * Per Prompt 2 §4, §15.
 */
export { createCompilerContext, runPipeline, stageAuthoringToSeed, stageSeedToIr, stageIrToPlan, stagePlanToArtifact, } from './pipeline.js';
export { createExpansionPlan, addOperation, validatePlan, } from './expansion-plan.js';
export { createArtifactGraph, addArtifact, emitArtifacts, } from './artifact-graph.js';
// Reference fixtures
export { fixtureSoftwareArchitecture, fixtureInteractiveScene, fixtureMixedVideoGame, } from './fixtures.js';
// IR Reconstruction
export { reconstructSeedFromIr, verifyIndependentReconstruction } from './ir-reconstructor.js';
// Semantic Verification
export { evaluateConstraint, authorizeEffects, enforceResourceBudgets, checkInvariants, verifyPipelineOutputs, checkConstraintSatisfaction, } from './semantic-verifier.js';
//# sourceMappingURL=index.js.map