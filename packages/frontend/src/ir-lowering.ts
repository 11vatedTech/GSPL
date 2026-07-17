/** IR lowering - CanonicalSeed -> GsplIrGraph via compiler-core. Prompt 3 §17. */
import type { GsplIrGraph, ProvenanceRecord } from "@gspl/ir-model";
import type { Diagnostic } from "@gspl/text-source";
import type { CompilerContext, CompilerSession, SeedToIrResult } from "@gspl/compiler-core";
import { createCompilerContext, stageSeedToIr, stageAuthoringToSeed } from "@gspl/compiler-core";
import type { AuthoringProgram } from "./authoring.js";
import type { CanonicalLoweringResult } from "./canonical-lowering.js";
import { lowerToCanonicalSeed, DEFAULT_LOWERING_OPTIONS } from "./canonical-lowering.js";

export interface IrLoweringOptions {
  readonly languageVersion: string;
  readonly domainId: string;
  readonly author: string;
  readonly limits?: Partial<Record<string, number>>;
}

export const DEFAULT_IR_OPTIONS: IrLoweringOptions = {
  languageVersion: "gspl-text/1.0",
  domainId: "generic",
  author: "gspl-frontend",
};

export interface IrLoweringResult {
  readonly ir: GsplIrGraph | undefined;
  readonly diagnostics: readonly Diagnostic[];
  readonly provenance: readonly ProvenanceRecord[];
  readonly ok: boolean;
}

export function lowerToIr(canonicalResult: CanonicalLoweringResult, options?: Partial<IrLoweringOptions>): IrLoweringResult {
  var opts: IrLoweringOptions = { ...DEFAULT_IR_OPTIONS, ...options };
  if (!canonicalResult.ok || !canonicalResult.seed) {
    return { ir: undefined, diagnostics: canonicalResult.diagnostics, provenance: [], ok: false };
  }
  var ctx: CompilerContext = createCompilerContext({ limits: (opts.limits || {}) as any });
  var session: CompilerSession = { context: ctx, seed: canonicalResult.seed, diagnostics: [], provenance: [] };
  stageAuthoringToSeed(session);
  var result: SeedToIrResult = stageSeedToIr(session);
  var mergedDiags: Diagnostic[] = [...canonicalResult.diagnostics];
  for (var i = 0; i < result.diagnostics.length; i++) {
    mergedDiags.push(result.diagnostics[i] as unknown as Diagnostic);
  }
  return { ir: result.ir, diagnostics: mergedDiags, provenance: result.provenance, ok: result.ir !== undefined && result.ir.nodes.size > 0 };
}

export function compileAuthoringToIr(program: AuthoringProgram, options?: Partial<IrLoweringOptions>): IrLoweringResult {
  var opts: IrLoweringOptions = { ...DEFAULT_IR_OPTIONS, ...options };
  var canonicalResult = lowerToCanonicalSeed(program, {
    languageVersion: opts.languageVersion,
    domainId: opts.domainId,
    author: opts.author,
  });
  return lowerToIr(canonicalResult, options);
}
