/**
 * @gspl/compiler-core/reconstruction — ISOLATED reconstruction subpath
 *
 * Prompt 2 §2: the restart consumer must import only the minimum surface
 * needed to load IR + reconstruct a canonical seed. It must NOT transitively
 * import fixtures, the runPipeline, the producer, canonical fixture source,
 * original seed modules, or compiler session snapshots.
 *
 * The subpath barrel re-exports:
 *   - reconstructSeedFromIr
 *   - verifyIndependentReconstruction
 *   - createReconstructionContext (a stripped-down context builder that
 *     constructs the minimum gene registry + versions without depending on
 *     the full pipeline / artifact-graph / expansion-plan / fixtures
 *     machinery).
 *   - ReconstructionContext, IrReconstructionResult, IndependentVerificationResult
 *   - ReconstructDiagnostic, ReconstructDiagnosticCode, ReconstructDiagnosticSeverity,
 *     ReconstructDiagnosticCategory
 *   - RECONSTRUCTION_MODE, GENE_TYPE_RECONSTRUCTION_SUPPORT
 *
 * It does NOT re-export:
 *   - fixtures
 *   - fixture registry
 *   - runPipeline
 *   - any of the 5 fixture constants
 *   - any artifact-graph / expansion-plan / pipeline types
 */

export {
  reconstructSeedFromIr,
  verifyIndependentReconstruction,
  RECONSTRUCTION_MODE,
  GENE_TYPE_RECONSTRUCTION_SUPPORT,
  createReconstructionContext,
} from './context.js';

export type {
  ReconstructionContext,
  IrReconstructionResult,
  IndependentVerificationResult,
  ReconstructDiagnostic,
  ReconstructDiagnosticCode,
  ReconstructDiagnosticSeverity,
  ReconstructDiagnosticCategory,
  ReconstructionMode,
} from './context.js';
