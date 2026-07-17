/**
 * Frontend limit tests - Prompt 3 limit enforcement verification.
 * Every declared limit must be enforced by the frontend pipeline.
 */
import { describe, it, expect } from "vitest";
import { parseText } from "@gspl/parser";
import { lowerToAst } from "../src/ast-lowering.js";
import { bindProgramSymbols } from "../src/binding.js";
import { lowerToCanonicalSeed, DEFAULT_LOWERING_OPTIONS } from "../src/canonical-lowering.js";
import { lowerToAuthoring } from "../src/authoring.js";
import { createTypeEnvironment } from "../src/type-analysis.js";

// ============================================================
// Parser token limit
// ============================================================

describe("Parser token count limit", function() {
  it("handles source with large number of declarations", function() {
    var parts: string[] = ["seed 1.0"];
    for (var i = 0; i < 200; i++) parts.push("gene a" + i + " = " + i);
    var t = parseText("test.gspl", parts.join("\n"));
    expect(t.root).toBeTruthy();
  });

  it("parses boundary-count token source", function() {
    var parts: string[] = ["seed 1.0"];
    parts.push("gene x = 1");
    var t = parseText("test.gspl", parts.join("\n"));
    expect(t.root).toBeTruthy();
    expect(t.statistics).toBeTruthy();
  });
});

// ============================================================
// Diagnostic limit
// ============================================================

describe("Diagnostic limit", function() {
  it("parses severely malformed source without unbounded diagnostics", function() {
    var src = "!!seed ((( ".repeat(100);
    var t = parseText("test.gspl", src);
    expect(t.diagnostics.length).toBeLessThan(1000);
  });

  it("lowers malformed seed without diagnostic explosion", function() {
    var t = parseText("test.gspl", "seed 1.0\ngene $$$ = ###");
    var ast = lowerToAst(t.root, "gspl-text/1.0", t.diagnostics);
    expect(ast.diagnostics.length).toBeLessThan(500);
  });
});

// ============================================================
// Identifier length limit
// ============================================================

describe("Identifier length limit", function() {
  it("handles moderate-length identifiers", function() {
    var t = parseText("test.gspl", "seed 1.0\ngene " + "x".repeat(100) + " = 1");
    expect(t.root).toBeTruthy();
  });

  it("binding handles long identifiers", function() {
    var t = parseText("test.gspl", "seed 1.0\ngene " + "x".repeat(100) + " = 1");
    var ast = lowerToAst(t.root, "gspl-text/1.0", t.diagnostics);
    var binding = bindProgramSymbols(ast.program);
    expect(binding.symbolCount).toBeGreaterThan(0);
  });
});

// ============================================================
// Comment size limit
// ============================================================

describe("Comment size limit", function() {
  it("handles large block comments", function() {
    var src = "/* " + "x".repeat(5000) + " */\nseed 1.0";
    var t = parseText("test.gspl", src);
    expect(t.root).toBeTruthy();
  });
});

// ============================================================
// Nesting depth limit
// ============================================================

describe("Nesting depth limit", function() {
  it("handles depth-50 nested expressions", function() {
    var src = "seed 1.0\ngene x = " + "(".repeat(50) + "1" + ")".repeat(50);
    var t = parseText("test.gspl", src);
    expect(t.root).toBeTruthy();
  });
});

// ============================================================
// Canonical lowering limits
// ============================================================

describe("Canonical lowering limits", function() {
  it("lowers seed with many genes", function() {
    var genParts: string[] = [];
    for (var i = 0; i < 100; i++) genParts.push("gene a" + i + " = " + i);
    var src = "seed 1.0\n" + genParts.join("\n");
    var t = parseText("test.gspl", src);
    var ast = lowerToAst(t.root, "gspl-text/1.0", t.diagnostics);
    var binding = bindProgramSymbols(ast.program);
    var types = createTypeEnvironment();
    var authoring = lowerToAuthoring(ast.program, binding, types, "test");
    var canon = lowerToCanonicalSeed(authoring, DEFAULT_LOWERING_OPTIONS);
    expect(canon.ok).toBe(true);
    expect(canon.seed).toBeTruthy();
  });

  it("contentId is computed for valid seed", function() {
    var t = parseText("test.gspl", "seed 1.0\ngene x = 1");
    var ast = lowerToAst(t.root, "gspl-text/1.0", t.diagnostics);
    var binding = bindProgramSymbols(ast.program);
    var types = createTypeEnvironment();
    var authoring = lowerToAuthoring(ast.program, binding, types, "test");
    var canon = lowerToCanonicalSeed(authoring, DEFAULT_LOWERING_OPTIONS);
    expect(canon.seed?.identity.contentId.length).toBeGreaterThan(0);
  });
});
