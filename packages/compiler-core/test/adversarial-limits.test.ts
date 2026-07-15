/** Canonical Core Limits + Adversarial Enforcement — Prompt 2 §7 */
import { describe, it, expect } from "vitest";
import { makePrimordialSeed, canonicalizeSeed, computeSeedHash } from "@gspl/seed-format";
import { createIrGraph, addNode, addEdge } from "@gspl/ir-model";
import { createCompilerContext, runPipeline, DEFAULT_LIMITS } from "../src/pipeline.js";

export interface CanonicalCoreLimits {
  readonly maxInputBytes: number;
  readonly maxNestingDepth: number;
  readonly maxObjectMembers: number;
  readonly maxGenes: number;
  readonly maxConstraints: number;
  readonly maxPackageReferences: number;
  readonly maxDependencyDepth: number;
  readonly maxIrNodes: number;
  readonly maxIrEdges: number;
  readonly maxIrRegions: number;
  readonly maxExpansionOperations: number;
  readonly maxRuleDepth: number;
  readonly maxArtifacts: number;
  readonly maxArtifactBytes: number;
  readonly maxDiagnostics: number;
  readonly maxProvenanceRecords: number;
}

export const STANDARD_LIMITS: CanonicalCoreLimits = Object.freeze({
  maxInputBytes: 10 * 1024 * 1024, maxNestingDepth: 64, maxObjectMembers: 100000,
  maxGenes: 10000, maxConstraints: 10000, maxPackageReferences: 1000,
  maxDependencyDepth: 32, maxIrNodes: 100000, maxIrEdges: 500000,
  maxIrRegions: 1000, maxExpansionOperations: 1000000, maxRuleDepth: 32,
  maxArtifacts: 10000, maxArtifactBytes: 100 * 1024 * 1024,
  maxDiagnostics: 10000, maxProvenanceRecords: 100000,
});

export function enforceInputLimit(data: unknown, limits: CanonicalCoreLimits): { ok: boolean; diagnostic?: string } {
  var bytes = 0;
  try { bytes = new TextEncoder().encode(JSON.stringify(data)).length; } catch(e) { return { ok: false, diagnostic: "GSPL-LIMIT-INPUT-MALFORMED: Cannot serialize input" }; }
  if (bytes > limits.maxInputBytes) return { ok: false, diagnostic: "GSPL-LIMIT-INPUT-BYTES: Input exceeds " + limits.maxInputBytes + " bytes" };
  return { ok: true };
}

export function checkNestingDepth(obj: unknown, maxDepth: number, depth?: number): { ok: boolean; diagnostic?: string } {
  var d = depth || 0;
  if (d > maxDepth) return { ok: false, diagnostic: "GSPL-LIMIT-NESTING: Depth " + d + " exceeds " + maxDepth };
  if (typeof obj === "object" && obj !== null) {
    if (Array.isArray(obj)) {
      for (var i = 0; i < obj.length; i++) { var r = checkNestingDepth(obj[i], maxDepth, d + 1); if (!r.ok) return r; }
    } else {
      var keys = Object.keys(obj as Record<string,unknown>);
      for (var i = 0; i < keys.length; i++) { var r = checkNestingDepth((obj as Record<string,unknown>)[keys[i]], maxDepth, d + 1); if (!r.ok) return r; }
    }
  }
  return { ok: true };
}

describe("Adversarial Resource Limits", function() {
  it("rejects deeply nested seed", function() {
    var deep: any = { val: "leaf" };
    for (var i = 0; i < 100; i++) { deep = { nested: deep }; }
    var s = makePrimordialSeed({ payload: { schemaVersion: "1.0", genes: { deep: { type: "symbolic", value: deep } } } });
    var result = checkNestingDepth(s, STANDARD_LIMITS.maxNestingDepth);
    expect(result.ok).toBe(false);
  });

  it("accepts shallow seed", function() {
    var s = makePrimordialSeed({ payload: { schemaVersion: "1.0", genes: { x: { type: "symbolic", value: "hello" } } } });
    var result = checkNestingDepth(s, STANDARD_LIMITS.maxNestingDepth);
    expect(result.ok).toBe(true);
  });

  it("rejects oversized input", function() {
    var big = makePrimordialSeed({ payload: { schemaVersion: "1.0", genes: { x: { type: "symbolic", value: "x".repeat(20 * 1024 * 1024) } } } });
    var result = enforceInputLimit(big, STANDARD_LIMITS);
    expect(result.ok).toBe(false);
  });

  it("enforces node limit on IR graph", function() {
    var ctx = createCompilerContext({ limits: { ...DEFAULT_LIMITS, maxNodeCount: 3, maxEdgeCount: 100, maxNesting: 32, maxDiagnosticCount: 1000, maxExpansionOperations: 1000, maxRuleDepth: 32, maxReferencedPackageCount: 100 } });
    var seed = makePrimordialSeed({ payload: { schemaVersion: "1.0", genes: { a: { type: "struct", value: { f1: 1, f2: 2, f3: 3, f4: 4 } } } } });
    var result = runPipeline(ctx, seed);
    expect(result.ok).toBe(false);
  });

  // §16 — NaN is explicitly forbidden by canon-foundation's JCS serializer.
  // Verify the throw propagates so callers can pre-detect malformed scalars.
  it("rejects NaN values", function() {
    var s = makePrimordialSeed({ payload: { schemaVersion: "1.0", genes: { x: { type: "scalar", value: NaN } } } });
    var threw = false;
    try { canonicalizeSeed(s); } catch { threw = true; }
    expect(threw).toBe(true);
  });

  // §15 — empty seed is a closure-critical fail: the verifier emits
  // GSPL-PIPE-EMPTY-IR; an empty seed is NOT a successful pipeline run.
  it("handles empty seed safely", function() {
    var s = makePrimordialSeed({ payload: { schemaVersion: "1.0", genes: {} } });
    var result = runPipeline(createCompilerContext(), s);
    expect(result.ok).toBe(false);
    expect(result.session.diagnostics.some(function(d) { return d.code === "GSPL-PIPE-EMPTY-IR"; })).toBe(true);
  });
});