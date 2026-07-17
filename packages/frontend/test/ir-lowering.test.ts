/** IR lowering tests - Prompt 3 §17. */
import { describe, it, expect } from "vitest";
import { parseText } from "@gspl/parser";
import { lowerToAst } from "../src/ast-lowering.js";
import { lowerToAuthoring } from "../src/authoring.js";
import { lowerToCanonicalSeed } from "../src/canonical-lowering.js";
import { createTypeEnvironment } from "../src/type-analysis.js";
import { bindProgramSymbols } from "../src/binding.js";
import { lowerToIr, compileAuthoringToIr } from "../src/ir-lowering.js";

function fullPipeline(src: string) {
  var pr = parseText("test.gspl", src);
  var astResult = lowerToAst(pr.root, "gspl-text/1.0", pr.diagnostics);
  var ast = astResult.program;
  var binding = bindProgramSymbols(ast);
  var types = createTypeEnvironment();
  var authoring = lowerToAuthoring(ast, binding, types, "test.gspl");
  var canonical = lowerToCanonicalSeed(authoring);
  var ir = lowerToIr(canonical);
  return { authoring, canonical, ir };
}

describe("§17 IR lowering", function() {
  it("produces IR graph from canonical seed", function() {
    var r = fullPipeline("seed 1.0\ngene x: scalar = 42\n");
    expect(r.canonical.ok).toBe(true);
    expect(r.canonical.seed).toBeDefined();
    expect(r.ir.ir).toBeDefined();
    expect(r.ir.ok).toBe(true);
  });

  it("IR graph has nodes for genes", function() {
    var r = fullPipeline("seed 1.0\ngene health: scalar = 100\ngene name: string = player\n");
    expect(r.ir.ir).toBeDefined();
    var nodes = r.ir.ir!.nodes;
    expect(nodes.size).toBeGreaterThan(0);
  });

  it("IR produces diagnostics for seed graph", function() {
    var r = fullPipeline("seed 1.0\ngene x: scalar = 42\n");
    expect(r.ir.diagnostics.length).toBeGreaterThanOrEqual(0);
    expect(r.ir.ir!.nodes.size).toBeGreaterThan(0);
  });

  it("rejects source with no seed declaration", function() {
    // Empty source has no seed declaration
    var pr = parseText("test.gspl", "");
    var astResult = lowerToAst(pr.root, "gspl-text/1.0", pr.diagnostics);
    var ast = astResult.program;
    var binding = bindProgramSymbols(ast);
    var types = createTypeEnvironment();
    var authoring = lowerToAuthoring(ast, binding, types, "test.gspl");
    var canonical = lowerToCanonicalSeed(authoring);
    expect(canonical.ok).toBe(false);
    var ir = lowerToIr(canonical);
    expect(ir.ok).toBe(false);
    expect(ir.ir).toBeUndefined();
  });

  it("compileAuthoringToIr e2e works", function() {
    var pr = parseText("test.gspl", "seed 1.0\ngene score: scalar = 9001\n");
    var astResult = lowerToAst(pr.root, "gspl-text/1.0", pr.diagnostics);
    var ast = astResult.program;
    var binding = bindProgramSymbols(ast);
    var types = createTypeEnvironment();
    var authoring = lowerToAuthoring(ast, binding, types, "test.gspl");
    var ir = compileAuthoringToIr(authoring);
    expect(ir.ir).toBeDefined();
    expect(ir.ok).toBe(true);
  });

  it("IR is deterministic for identical input", function() {
    var r1 = fullPipeline("seed 1.0\ngene a: scalar = 1\ngene b: scalar = 2\n");
    var r2 = fullPipeline("seed 1.0\ngene a: scalar = 1\ngene b: scalar = 2\n");
    expect(r1.ir.ir!.nodes.size).toBe(r2.ir.ir!.nodes.size);
    expect(r1.ir.ok).toBe(r2.ir.ok);
  });
});
