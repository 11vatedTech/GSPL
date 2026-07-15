/** Comprehensive canonicalization tests — Prompt 2 §3, §10 */
import { describe, it, expect } from "vitest";
import { canonicalizeSeed, makePrimordialSeed, extractCanonicalHashMaterial, computeSeedHash } from "@gspl/seed-format";
import { createIrGraph, addNode, normalizeGraph } from "@gspl/ir-model";
import { runPipeline, createCompilerContext } from "../src/pipeline.js";
import { verifyIndependentReconstruction, reconstructSeedFromIr } from "../src/ir-reconstructor.js";
import { fixtureSoftwareArchitecture, fixtureInteractiveScene, fixtureMixedVideoGame } from "../src/fixtures.js";

function bytesEqual(a, b) {
  if (a.length !== b.length) return false;
  for (var i = 0; i < a.length; i++) { if (a[i] !== b[i]) return false; }
  return true;
}

describe("Canonicalization Order Independence", function() {
  it("produces identical bytes for differently-ordered root keys", function() {
    var s1 = makePrimordialSeed({ namespace: { domain: "test", name: "x" }, intent: { purpose: "p" }, payload: { schemaVersion: "1.0", genes: {} }, domainProfile: { domainId: "seed", requiredCapabilities: [], optionalCapabilities: [] } });
    var s2 = makePrimordialSeed({ domainProfile: { domainId: "seed", requiredCapabilities: [], optionalCapabilities: [] }, intent: { purpose: "p" }, payload: { schemaVersion: "1.0", genes: {} }, namespace: { domain: "test", name: "x" } });
    var b1 = canonicalizeSeed(s1);
    var b2 = canonicalizeSeed(s2);
    expect(bytesEqual(b1, b2)).toBe(true);
  });

  it("produces identical canonical bytes regardless of gene declaration order", function() {
    function make(genes) {
      return makePrimordialSeed({ payload: { schemaVersion: "1.0", genes: genes } });
    }
    var s1 = make({ b: { type: "symbolic", value: "B" }, a: { type: "symbolic", value: "A" } });
    var s2 = make({ a: { type: "symbolic", value: "A" }, b: { type: "symbolic", value: "B" } });
    var b1 = canonicalizeSeed(s1);
    var b2 = canonicalizeSeed(s2);
    expect(bytesEqual(b1, b2)).toBe(true);
  });

  it("changing a gene value MUST change the canonical output", function() {
    var s1 = makePrimordialSeed({ payload: { schemaVersion: "1.0", genes: { x: { type: "symbolic", value: "A" } } } });
    var s2 = makePrimordialSeed({ payload: { schemaVersion: "1.0", genes: { x: { type: "symbolic", value: "B" } } } });
    var b1 = canonicalizeSeed(s1);
    var b2 = canonicalizeSeed(s2);
    expect(bytesEqual(b1, b2)).toBe(false);
  });

  it("canonical hash is deterministic", function() {
    var s = makePrimordialSeed({ payload: { schemaVersion: "1.0", genes: { x: { type: "symbolic", value: "test" } } } });
    var h1 = computeSeedHash(s);
    var h2 = computeSeedHash(s);
    expect(h1).toBe(h2);
  });
});

describe("Seed to IR to Seed Round Trip", function() {
  var fixtures = [
    { name: "software-architecture", seed: fixtureSoftwareArchitecture },
    { name: "interactive-scene", seed: fixtureInteractiveScene },
    { name: "mixed-video-game", seed: fixtureMixedVideoGame },
  ];

  for (var i = 0; i < fixtures.length; i++) {
    var f = fixtures[i];
    it(f.name + ": produces non-empty IR", function() {
      var ctx = createCompilerContext();
      var result = runPipeline(ctx, f.seed);
      expect(result.session.ir).toBeDefined();
      expect(result.session.ir.nodes.size).toBeGreaterThan(0);
    });

    it(f.name + ": produces non-empty plan", function() {
      var ctx = createCompilerContext();
      var result = runPipeline(ctx, f.seed);
      expect(result.session.plan).toBeDefined();
      expect(result.session.plan.operations.length).toBeGreaterThan(0);
    });

    it(f.name + ": produces non-empty artifacts", function() {
      var ctx = createCompilerContext();
      var result = runPipeline(ctx, f.seed);
      expect(result.session.artifactGraph).toBeDefined();
      expect(result.session.artifactGraph.artifacts.length).toBeGreaterThan(0);
    });

    it(f.name + ": roundtrip preserves canonical bytes", function() {
      var ctx = createCompilerContext();
      var result = runPipeline(ctx, f.seed);
      var normalized = result.session.normalizedSeed || f.seed;
      var ir = result.session.ir;
      var originalBytes = canonicalizeSeed(normalized);
      // §5: reconstruction-context geneRegistry comes from the SAME compiler context that
      // produced the IR (closure variable `ctx`), not from an undefined identifier.
      var reconCtx = {
        schemaRegistry: {},
        geneRegistry: ctx.geneRegistry,
        compilerVersion: ctx.compilerVersion,
        canonVersion: ctx.canonVersion,
        limits: { maxGenes: 1000, maxConstraints: 1000, maxDependencies: 1000 },
      };
      var rt = verifyIndependentReconstruction(originalBytes, ir!, reconCtx);
      expect(rt.ok).toBe(true);
      expect(rt.bytesMatch).toBe(true);
    });

    it(f.name + ": deterministic across two runs", function() {
      var r1 = runPipeline(createCompilerContext(), f.seed);
      var r2 = runPipeline(createCompilerContext(), f.seed);
      var b1 = canonicalizeSeed(r1.session.normalizedSeed || f.seed);
      var b2 = canonicalizeSeed(r2.session.normalizedSeed || f.seed);
      expect(bytesEqual(b1, b2)).toBe(true);
      expect(computeSeedHash(r1.session.normalizedSeed || f.seed)).toBe(computeSeedHash(r2.session.normalizedSeed || f.seed));
    });
  }
});

describe("Graph Normalization Determinism", function() {
  it("same graph with reversed insertion order produces same hash", function() {
    var g1 = createIrGraph({ seedIdentityHash: "test", compilerVersion: "1.0", canonVersion: "1.0" });
    addNode(g1, { id: "n1", kind: "value", type: "symbolic", value: "a", attributes: {}, provenance: { source: "default", originId: "test" } });
    addNode(g1, { id: "n2", kind: "value", type: "symbolic", value: "b", attributes: {}, provenance: { source: "default", originId: "test" } });
    var g2 = createIrGraph({ seedIdentityHash: "test", compilerVersion: "1.0", canonVersion: "1.0" });
    addNode(g2, { id: "n2", kind: "value", type: "symbolic", value: "b", attributes: {}, provenance: { source: "default", originId: "test" } });
    addNode(g2, { id: "n1", kind: "value", type: "symbolic", value: "a", attributes: {}, provenance: { source: "default", originId: "test" } });
    var n1 = normalizeGraph(g1);
    var n2 = normalizeGraph(g2);
    expect(n1.normalizationHash).toBe(n2.normalizationHash);
  });

  it("normalization is idempotent", function() {
    var g = createIrGraph({ seedIdentityHash: "test", compilerVersion: "1.0", canonVersion: "1.0" });
    addNode(g, { id: "n1", kind: "value", type: "symbolic", value: "x", attributes: {}, provenance: { source: "default", originId: "test" } });
    var n1 = normalizeGraph(g);
    var n2 = normalizeGraph(n1);
    expect(n1.normalizationHash).toBe(n2.normalizationHash);
  });
});

describe("Hash Boundary", function() {
  it("contentId is excluded from hash material", function() {
    var s = makePrimordialSeed({ payload: { schemaVersion: "1.0", genes: { x: { type: "symbolic", value: "test" } } } });
    var material = extractCanonicalHashMaterial(s);
    var matAny = material;
    expect(matAny.contentId).toBeUndefined();
  });

  it("changing non-hash metadata does not change hash", function() {
    var s1 = makePrimordialSeed({ payload: { schemaVersion: "1.0", genes: { x: { type: "symbolic", value: "test" } } }, validationRequirements: ["req-a"] });
    var s2 = makePrimordialSeed({ payload: { schemaVersion: "1.0", genes: { x: { type: "symbolic", value: "test" } } }, validationRequirements: ["req-b"] });
    expect(computeSeedHash(s1)).toBe(computeSeedHash(s2));
  });

  it("changing a hashed field changes hash", function() {
    var s1 = makePrimordialSeed({ payload: { schemaVersion: "1.0", genes: { x: { type: "symbolic", value: "test" } } } });
    var s2 = makePrimordialSeed({ payload: { schemaVersion: "1.0", genes: { x: { type: "symbolic", value: "different" } } } });
    expect(computeSeedHash(s1)).not.toBe(computeSeedHash(s2));
  });
});
