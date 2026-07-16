/**
 * reconstruction/context.ts — isolated reconstruction context helper.
 *
 * Prompt 2 §2: the restart consumer must import only the minimum surface
 * needed to load IR + reconstruct a canonical seed.
 */

import { createStandardGeneRegistry } from '@gspl/gene-protocol';
import type { GeneTypeRegistry } from '@gspl/gene-protocol';

export {
  reconstructSeedFromIr,
  verifyIndependentReconstruction,
  RECONSTRUCTION_MODE,
  GENE_TYPE_RECONSTRUCTION_SUPPORT,
} from '../ir-reconstructor.js';

export type {
  ReconstructionContext,
  IrReconstructionResult,
  IndependentVerificationResult,
  ReconstructDiagnostic,
  ReconstructDiagnosticCode,
  ReconstructDiagnosticSeverity,
  ReconstructDiagnosticCategory,
  ReconstructionMode,
} from '../ir-reconstructor.js';

export const COMPILER_VERSION = "0.1.0";
export const CANON_VERSION = "1.0";

export const DEFAULT_SCHEMA_REGISTRY: Readonly<Record<string, string>> = Object.freeze({
  'gspl.canonical-seed': '1.0',
});

export const DEFAULT_RECONSTRUCTION_LIMITS = Object.freeze({
  maxGenes: 10_000,
  maxConstraints: 10_000,
  maxDependencies: 10_000,
});

export function createReconstructionContext(
  overrides?: Partial<{
    geneRegistry: GeneTypeRegistry;
    compilerVersion: string;
    canonVersion: string;
    schemaRegistry: Readonly<Record<string, string>>;
    limits: { maxGenes: number; maxConstraints: number; maxDependencies: number };
  }>,
): {
  geneRegistry: GeneTypeRegistry;
  compilerVersion: string;
  canonVersion: string;
  schemaRegistry: Readonly<Record<string, string>>;
  limits: { maxGenes: number; maxConstraints: number; maxDependencies: number };
} {
  return {
    geneRegistry: overrides?.geneRegistry ?? createStandardGeneRegistry(),
    compilerVersion: overrides?.compilerVersion ?? COMPILER_VERSION,
    canonVersion: overrides?.canonVersion ?? CANON_VERSION,
    schemaRegistry: overrides?.schemaRegistry ?? DEFAULT_SCHEMA_REGISTRY,
    limits: overrides?.limits ?? { ...DEFAULT_RECONSTRUCTION_LIMITS },
  };
}
