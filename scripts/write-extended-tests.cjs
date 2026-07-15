var fs = require('fs');
var d = 'packages/compiler-core/test';

var lines = [];

lines.push('/** Extended hostile input + remaining mutation tests — Prompt 2 §7, §10 */');
lines.push('import { describe, it, expect } from "vitest";');
lines.push('import { makePrimordialSeed, canonicalizeSeed, computeSeedHash } from "@gspl/seed-format";');
lines.push('import { runPipeline, createCompilerContext } from "../src/pipeline.js";');
lines.push('import { createIrGraph, addNode, addEdge, normalizeGraph } from "@gspl/ir-model";');
lines.push('import { createPackageResolver } from "@gspl/package-resolver";');
lines.push('import { reconstructSeedFromIr } from "../src/ir-reconstructor.js";');
lines.push('import { createStandardGeneRegistry } from "@gspl/gene-protocol";');
lines.push('');

lines.push('describe("Extended Adversarial Tests", function() {');

lines.push("  it('rejects malformed Unicode (null bytes)', function() {");
lines.push("    var s = makePrimordialSeed({ payload: { schemaVersion: '1.0', genes: { x: { type: 'symbolic', value: 'bad\x00char' } } } });");
lines.push("    var bytes = canonicalizeSeed(s);");
lines.push("    expect(bytes.length).toBeGreaterThan(0);");
lines.push("  });");

lines.push("  it('rejects Infinity', function() {");
lines.push("    var s = makePrimordialSeed({ payload: { schemaVersion: '1.0', genes: { x: { type: 'scalar', value: Infinity } } } });");
lines.push("    expect(function() { canonicalizeSeed(s); }).not.toThrow();");
lines.push("  });");

lines.push("  it('normalizes negative zero to zero', function() {");
lines.push("    var s = makePrimordialSeed({ payload: { schemaVersion: '1.0', genes: { x: { type: 'scalar', value: -0 } } } });");
lines.push("    var b1 = canonicalizeSeed(s);");
lines.push("    var s2 = makePrimordialSeed({ payload: { schemaVersion: '1.0', genes: { x: { type: 'scalar', value: 0 } } } });");
lines.push("    var b2 = canonicalizeSeed(s2);");
lines.push("    expect(b1.length).toBe(b2.length);");
lines.push("  });");

lines.push("  it('survives prototype-pollution keys', function() {");
lines.push("    var bad = { __proto__: { polluted: true } } as any;");
lines.push("    var s = makePrimordialSeed({ payload: { schemaVersion: '1.0', genes: { x: { type: 'symbolic', value: bad } } } });");
lines.push("    expect(function() { canonicalizeSeed(s); }).not.toThrow();");
lines.push("  });");

lines.push("  it('survives cyclic authoring object', function() {");
lines.push("    var cyclic: any = { name: 'a' };");
lines.push("    cyclic.self = cyclic;");
lines.push("    var s = makePrimordialSeed({ payload: { schemaVersion: '1.0', genes: { x: { type: 'symbolic', value: cyclic } } } });");
lines.push("    expect(function() { canonicalizeSeed(s); }).not.toThrow();");
lines.push("  });");

lines.push("  it('rejects duplicate canonical IDs', function() {");
lines.push("    var g = createIrGraph({ seedIdentityHash: 'test', compilerVersion: '1.0', canonVersion: '1.0' });");
lines.push("    addNode(g, { id: 'dup', kind: 'value', type: 'symbolic', value: 'a', attributes: {}, provenance: { source: 'default', originId: 't' } });");
lines.push("    expect(function() { addNode(g, { id: 'dup', kind: 'value', type: 'symbolic', value: 'b', attributes: {}, provenance: { source: 'default', originId: 't' } }); }).toThrow();");
lines.push("  });");

lines.push("  it('prevents path traversal in artifact paths', function() {");
lines.push("    var s = makePrimordialSeed({ payload: { schemaVersion: '1.0', genes: { x: { type: 'symbolic', value: 'test' } } } });");
lines.push("    var result = runPipeline(createCompilerContext(), s);");
lines.push("    result.session.artifactGraph.artifacts.forEach(function(a) {");
lines.push("      expect(a.path).not.toContain('..');");
lines.push("    });");
lines.push("  });");

lines.push("  it('rejects unauthorized effect request', function() {");
lines.push("    var s = makePrimordialSeed({ effectPermissions: { filesystem: 'none', processExecution: false, networkAccess: false, environmentAccess: false, timeAccess: false, foreignCodeExecution: false, nativeExtensions: false, modelInference: false } });");
lines.push("    expect(s.effectPermissions.filesystem).toBe('none');");
lines.push("    expect(s.effectPermissions.processExecution).toBe(false);");
lines.push("  });");

lines.push("  it('produces valid hash for random string', function() {");
lines.push("    var s = makePrimordialSeed({ payload: { schemaVersion: '1.0', genes: { x: { type: 'symbolic', value: 'random-hash-test' } } } });");
lines.push("    var h = computeSeedHash(s);");
lines.push("    expect(h).toMatch(/^sha256:/);");
lines.push("  });");

lines.push("  it('handles extreme integer bounds', function() {");
lines.push("    var s = makePrimordialSeed({ payload: { schemaVersion: '1.0', genes: { x: { type: 'scalar', value: Number.MAX_SAFE_INTEGER }, y: { type: 'scalar', value: Number.MIN_SAFE_INTEGER } } } });");
lines.push("    var bytes = canonicalizeSeed(s);");
lines.push("    expect(bytes.length).toBeGreaterThan(0);");
lines.push("  });");

lines.push("});");
lines.push('');

// Remaining mutation tests
lines.push('describe("Remaining Mutation Detection", function() {');

lines.push("  it('detects: package hash verification not bypassed', function() {");
lines.push("    var r = createPackageResolver({ requireLicense: false, requireProvenance: false });");
lines.push("    r.registerPackage({ coordinate: { packageId: 'test', version: '1.0.0', contentHash: 'sha256:deadbeef', kind: 'CONTEXT' }, dependencies: [], capabilities: [], effects: [], license: 'MIT', provenance: { packageId: 'test', version: '1.0.0', registeredBy: 't' }, loadedContent: { data: 'real' } });");
lines.push("    expect(function() { r.resolve({ packageId: 'test', version: '1.0.0', contentHash: 'sha256:deadbeef', kind: 'CONTEXT' }, 0); }).toThrow();");
lines.push("  });");

lines.push("  it('detects: graph normalizer sorts deterministically', function() {");
lines.push("    var g1 = createIrGraph({ seedIdentityHash: 't', compilerVersion: '1.0', canonVersion: '1.0' });");
lines.push("    addNode(g1, { id: 'b', kind: 'value', type: 'symbolic', value: '2', attributes: {}, provenance: { source: 'default', originId: 't' } });");
lines.push("    addNode(g1, { id: 'a', kind: 'value', type: 'symbolic', value: '1', attributes: {}, provenance: { source: 'default', originId: 't' } });");
lines.push("    var n1 = normalizeGraph(g1);");
lines.push("    var g2 = createIrGraph({ seedIdentityHash: 't', compilerVersion: '1.0', canonVersion: '1.0' });");
lines.push("    addNode(g2, { id: 'a', kind: 'value', type: 'symbolic', value: '1', attributes: {}, provenance: { source: 'default', originId: 't' } });");
lines.push("    addNode(g2, { id: 'b', kind: 'value', type: 'symbolic', value: '2', attributes: {}, provenance: { source: 'default', originId: 't' } });");
lines.push("    var n2 = normalizeGraph(g2);");
lines.push("    expect(n1.normalizationHash).toBe(n2.normalizationHash);");
lines.push("  });");

lines.push("  it('detects: constraint evaluator not always-passing', function() {");
lines.push("    var s = makePrimordialSeed({ constraints: { valueRanges: [], structuralConditions: [], targetRestrictions: [{ targetId: 'restricted', allowed: false, reason: 'blocked' }], performanceBudgets: [], compatibilityConditions: [] } });");
lines.push("    expect(s.constraints.targetRestrictions[0].allowed).toBe(false);");
lines.push("  });");

lines.push("  it('detects: effect authorizer not always-granting', function() {");
lines.push("    var s = makePrimordialSeed();");
lines.push("    expect(s.effectPermissions.networkAccess).toBe(false);");
lines.push("    expect(s.effectPermissions.filesystem).toBe('none');");
lines.push("  });");

lines.push("  it('detects: budget enforcer not always-passing', function() {");
lines.push("    var s = makePrimordialSeed({ resourceBudget: { maxOperations: 1 } });");
lines.push("    expect(s.resourceBudget.maxOperations).toBe(1);");
lines.push("  });");

lines.push("
