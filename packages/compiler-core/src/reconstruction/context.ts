/**
 * reconstruction/context.ts — isolated reconstruction context helper.
 *
 * Prompt 2 §2: the restart consumer must import only the minimum surface
 * needed to load IR + reconstruct a canonical seed. This file provides:
 *
 *   - createReconstructionContext(): builds a context with the standard gene
 *     registry (from @gspl/gene-protocol, NOT from compiler-core pipeline),
 *     compiler/canon versions, schema registry, and explicit reconstruction
 *     limits. Does NOT depend on pipeline.ts / artifact-graph.ts /
 *     expansion-plan.ts / fixtures.ts.
 *
 *   - re-exports of reconstructSeedFromIr, verifyIndependentReconstruction,
 *     and the diagnostic types from the existing ir-reconstructor.ts.
 */

import { createStandardGeneRegistry } from '@gspl/gene-protocol';
import type { GeneTypeRegistry } from '@gspl/gene-protocol';

import {
  reconstructSeedFromIr as _reconstructSeedFromIr,
  verifyIndependentReconstruction as _verifyIndependentReconstruction,
  RECONSTRUCTION_MODE as _RECONSTRUCTION_MODE,
  GENE_TYPE_RECONSTRUCTION_SUPPORT as _GENE_TYPE_RECONSTRUCTION_SUPPORT,
} from '../ir-reconstructor.js';
import type {
  IrReconstructionResult as _IrReconstructionResult,
  IndependentVerificationResult as _IndependentVerificationResult,
  ReconstructDiagnostic as _ReconstructDiagnostic,
  ReconstructDiagnosticCode as _ReconstructDiagnosticCode,
  ReconstructDiagnosticSeverity as _ReconstructDiagnosticSeverity,
  ReconstructDiagnosticCategory as _ReconstructDiagnosticCategory,
  ReconstructionMode as _ReconstructionMode,
} from '../ir-reconstructor.js';

/** COMPILER_VERSION and CANON_VERSION must be kept byte-identical across the
 *  producer and consumer processes so that reconstructed seeds are byte-equal
 *  to originals. These are the same constants as in pipeline.ts. */
export const COMPILER_VERSION = '0.1.0';
export const CANON_VERSION = '1.0';

/** Schema registry passed to the reconstructor. */
export const DEFAULT_SCHEMA_REGISTRY: Readonly<Record<string, string>> = Object.freeze({
  'gspl.canonical-seed': '1.0',
});

/** Reconstruction limits — explicit ceilings, NOT a copy of pipeline limits. */
export const DEFAULT_RECONSTRUCTION_LIMITS = Object.freeze({
  maxGenes: 10_000,
  maxConstraints: 10_000,
  maxDependencies: 10_000,
});

export interface ReconstructionContext {
  readonly geneRegistry: GeneTypeRegistry;
  readonly compilerVersion: string;
  readonly canonVersion: string;
  readonly schemaRegistry: Readonly<Record<string, string>>;
  readonly limits: {
    readonly maxGenes: number;
    readonly maxConstraints: number;
    readonly maxDependencies: number;
  };
}

/**
 * createReconstructionContext — builds the minimum context needed by
 * `reconstructSeedFromIr`. Uses `createStandardGeneRegistry()` from
 * `@gspl/gene-protocol`, which is independent of the compiler-core
 * pipeline / fixtures.
 */
export function createReconstructionContext(
  overrides?: Partial<ReconstructionContext>,
): ReconstructionContext {
  return {
    geneRegistry: overrides?.geneRegistry ?? createStandardGeneRegistry(),
    compilerVersion: overrides?.compilerVersion ?? COMPILER_VERSION,
    canonVersion: overrides?.canonVersion ?? CANON_VERSION,
    schemaRegistry: overrides?.schemaRegistry ?? DEFAULT_SCHEMA_REGISTRY,
    limits: overrides?.limits ?? { ...DEFAULT_RECONSTRUCTION_LIMITS },
  };
}

// Re-export the public surface.
export const RECONSTRUCTION_MODE = _RECONSTRUCTION_MODE;
export const GENE_TYPE_RECONSTRUCTION_SUPPORT = _GENE_TYPE_RECONSTRUCTION_SUPPORT;
export const reconstructSeedFromIr = _reconstructSeedFromIr;
export const verifyIndependentReconstruction = _verifyIndependentReconstruction;

export type ReconstructionMode = _ReconstructionMode;
export type IrReconstructionResult = _IrReconstructionResult;
export type IndependentVerificationResult = _IndependentVerificationResult;
export type ReconstructDiagnostic = _ReconstructDiagnostic;
export type ReconstructDiagnosticCode = _ReconstructDiagnosticCode;
export type ReconstructDiagnosticSeverity = _ReconstructDiagnosticSeverity;
export type ReconstructDiagnosticCategory = _ReconstructDiagnosticCategory;
