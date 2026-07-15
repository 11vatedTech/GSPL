/** Sabotage tests — Prompt 2 §2: prove reconstruction independence */
import { describe, it, expect, beforeEach } from "vitest";
import { makePrimordialSeed, canonicalizeSeed, computeSeedHash } from "@gspl/seed-format";
import { runPipeline, createCompilerContext } from "../src/pipeline.js";
import { reconstructSeedFromIr } from "../src/ir-reconstructor.js";
import type { ReconstructionContext } from "../src/ir-reconstructor.js";
import { fixtureSoftwareArchitecture } from "../src/fixtures.js";
import { createStandardGeneRegistry } from "@gspl/gene-protocol";
import * as path from "node:path";
import * as fsSync from "node:fs";
import { execSync } from "node:child_process";

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (var i = 0; i < a.length; i++) { if (a[i] !== b[i]) return false; }
  return true;
}

var ctx: ReconstructionContext = { geneRegistry: createStandardGeneRegistry(), compilerVersion: "0.1.0", canonVersion: "1.0", limits: { maxGenes: 10000, maxConstraints: 10000, maxDependencies: 10000 } };

describe("Reconstruction Independence", function() {
  it("reconstructs seed from IR without original seed reference", function() {
    var seed = fixtureSoftwareArchitecture;
    var compilerCtx = createCompilerContext();
    var pipelineResult = runPipeline(compilerCtx, seed);
    var ir = pipelineResult.session.ir;
    expect(ir).toBeDefined();
    var seq = (seed as any)._sabotageSentinel = "ORIGINAL_WAS_HERE";
    var reconResult = reconstructSeedFromIr(ir!, ctx);
    expect(reconResult.ok).toBe(true);
  });

  it("mutating original seed after lowering does not change reconstruction", function() {
    var seed = makePrimordialSeed({ payload: { schemaVersion: "1.0", genes: { x: { type: "symbolic", value: "original" } } } });
    var compilerCtx = createCompilerContext();
    var pipelineResult = runPipeline(compilerCtx, seed);
    var ir = pipelineResult.session.ir;
    var recon1 = reconstructSeedFromIr(ir!, ctx);
    var b1 = canonicalizeSeed(recon1.seed);
    seed.payload.genes.x.value = "TAMPERED";
    seed.payload.genes.y = { type: "symbolic", value: "INJECTED" };
    var recon2 = reconstructSeedFromIr(ir!, ctx);
    var b2 = canonicalizeSeed(recon2.seed);
    expect(bytesEqual(b1, b2)).toBe(true);
  });

  it("original bytes survive round trip via IR", function() {
    var seed = makePrimordialSeed({ payload: { schemaVersion: "1.0", genes: { x: { type: "symbolic", value: "roundtrip-test" } } }, namespace: { domain: "test", name: "roundtrip" } });
    var compilerCtx = createCompilerContext();
    var pipelineResult = runPipeline(compilerCtx, seed);
    var normalized = pipelineResult.session.normalizedSeed;
    var ob = canonicalizeSeed(normalized!);
    var ir = pipelineResult.session.ir;
    var reconResult = reconstructSeedFromIr(ir!, ctx);
    var rb = canonicalizeSeed(reconResult.seed);
    expect(bytesEqual(ob, rb)).toBe(true);
  });
});