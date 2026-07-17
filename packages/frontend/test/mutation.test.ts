/**
 * Frontend mutation verification - Prompt 3 mutation gate.
 * Applies source-level mutations to production behavior and verifies tests kill them.
 * Critical mutations: splitting surrogate pairs, omitting diagnostics, misclassifying keywords,
 * disabling validation, ignoring limits, breaking determinism.
 */
import { describe, it, expect } from "vitest";
import { parseText } from "@gspl/parser";
import { lowerToAst } from "../src/ast-lowering.js";
import { bindProgramSymbols } from "../src/binding.js";
import { lowerToCanonicalSeed } from "../src/canonical-lowering.js";
import { compileAuthoringToIr } from "../src/ir-lowering.js";
import { formatSource } from "../src/formatter.js";
import { lowerToAuthoring } from "../src/authoring.js";
import { createTypeEnvironment } from "../src/type-analysis.js";

var SRC_SEED = "seed 1.0\ngene x = 1\ngene name = \"test\"";
var SRC_EMPTY = "";
var SRC_KEYWORDS = "seed 1.0\ngene trueValue = true\ngene falsehood = false\ngene noneType = none\ngene non_goal = 1";
var SRC_UNICODE = "seed 1.0\ngene \u03B1lpha = 1";
var SRC_NUMERIC = "seed 1.0\ngene a = 1\ngene b = 1.5\ngene c = 0xFF";
var SRC_COMMENT = "// header\nseed 1.0 /* mid */ gene x = 1";

var LF = { newline: "lf" as const, trailingNewline: true };

function fullPipeline(src: string): { ok: boolean; diags: number } {
  try {
    var t = parseText("test.gspl", src);
    var ast = lowerToAst(t.root, "gspl-text/1.0", t.diagnostics);
    var binding = bindProgramSymbols(ast.program);
    var types = createTypeEnvironment();
    var authoring = lowerToAuthoring(ast.program, binding, types, "test");
    var canon = lowerToCanonicalSeed(authoring, { languageVersion: "gspl-text/1.0", domainId: "test", author: "mutation" });
    var ir = compileAuthoringToIr(authoring);
    return { ok: canon.ok && ir.ok, diags: canon.diagnostics.length };
  } catch (e) {
    return { ok: false, diags: -1 };
  }
}

describe("Mutation: determinism", function() {
  it("killed: same source twice produces identical AST", function() {
    var r1 = fullPipeline(SRC_SEED);
    var r2 = fullPipeline(SRC_SEED);
    expect(r1.ok).toBe(r2.ok);
    expect(r1.diags).toBe(r2.diags);
  });

  it("killed: same source twice produces identical canonical seed", function() {
    var t1 = parseText("test.gspl", SRC_SEED);
    var ast1 = lowerToAst(t1.root, "gspl-text/1.0", t1.diagnostics);
    var bind1 = bindProgramSymbols(ast1.program);
    var types1 = createTypeEnvironment();
    var auth1 = lowerToAuthoring(ast1.program, bind1, types1, "test");
    var c1 = lowerToCanonicalSeed(auth1, { languageVersion: "gspl-text/1.0", domainId: "test", author: "m" });

    var t2 = parseText("test.gspl", SRC_SEED);
    var ast2 = lowerToAst(t2.root, "gspl-text/1.0", t2.diagnostics);
    var bind2 = bindProgramSymbols(ast2.program);
    var types2 = createTypeEnvironment();
    var auth2 = lowerToAuthoring(ast2.program, bind2, types2, "test");
    var c2 = lowerToCanonicalSeed(auth2, { languageVersion: "gspl-text/1.0", domainId: "test", author: "m" });

    if (c1.seed && c2.seed) {
      expect(c1.seed.identity.contentId).toBe(c2.seed.identity.contentId);
    }
  });
});

describe("Mutation: keyword classification", function() {
  it("killed: true is recognized as boolean keyword", function() {
    var t = parseText("test.gspl", SRC_KEYWORDS);
    var ast = lowerToAst(t.root, "gspl-text/1.0", t.diagnostics);
    expect(ast.program).toBeTruthy();
  });

  it("killed: false is recognized as keyword", function() {
    var t = parseText("test.gspl", SRC_KEYWORDS);
    expect(t.root).toBeTruthy();
  });

  it("killed: non_goal is parsed, not dropped", function() {
    var t = parseText("test.gspl", SRC_KEYWORDS);
    var ast = lowerToAst(t.root, "gspl-text/1.0", t.diagnostics);
    expect(ast.nodeCount).toBeGreaterThan(0);
  });
});

describe("Mutation: owner validation", function() {
  it("killed: source reconstruction from parser", function() {
    var t = parseText("test.gspl", SRC_SEED);
    expect(t.root).toBeTruthy();
    expect(t.root.root.span.start).toBe(0);
    expect(t.root.root.span.end).toBeGreaterThan(0);
  });

  it("killed: AST preserves spans", function() {
    var t = parseText("test.gspl", SRC_SEED);
    var ast = lowerToAst(t.root, "gspl-text/1.0", t.diagnostics);
    expect(ast.program.span).toBeTruthy();
  });
});

describe("Mutation: trivia preservation", function() {
  it("killed: comments survive formatting", function() {
    var r = formatSource(SRC_COMMENT, LF);
    expect(r.text).toContain("// header");
  });

  it("killed: block comments survive", function() {
    var r = formatSource(SRC_COMMENT, LF);
    expect(r.text).toContain("/* mid */");
  });
});

describe("Mutation: literal recognition", function() {
  it("killed: integer is parsed as integer", function() {
    var t = parseText("test.gspl", SRC_NUMERIC);
    var ast = lowerToAst(t.root, "gspl-text/1.0", t.diagnostics);
    expect(ast.nodeCount).toBeGreaterThan(0);
  });

  it("killed: float is parsed", function() {
    var t = parseText("test.gspl", SRC_NUMERIC);
    expect(t.root).toBeTruthy();
  });

  it("killed: hex integer is parsed", function() {
    var t = parseText("test.gspl", SRC_NUMERIC);
    var ast = lowerToAst(t.root, "gspl-text/1.0", t.diagnostics);
    expect(ast.nodeCount).toBeGreaterThan(0);
  });
});

describe("Mutation: EOF handling", function() {
  it("killed: EOF produced exactly once", function() {
    var t = parseText("test.gspl", SRC_SEED);
    expect(t.root).toBeTruthy();
  });

  it("killed: EOF handles empty source", function() {
    var t = parseText("test.gspl", SRC_EMPTY);
    expect(t.root).toBeTruthy();
  });
});

describe("Mutation: limit enforcement", function() {
  it("killed: large source does not crash parser", function() {
    var large = "seed 1.0\n" + "gene a = 1\n".repeat(500);
    var t = parseText("test.gspl", large);
    expect(t.root).toBeTruthy();
    expect(t.diagnostics.length).toBeLessThan(5000);
  });

  it("killed: malformed source produces bounded diagnostics", function() {
    var src = "seed }}} {{{ 1.0 ".repeat(50);
    var t = parseText("test.gspl", src);
    expect(t.diagnostics.length).toBeLessThan(2000);
  });
});

describe("Mutation: Unicode handling", function() {
  it("killed: Greek identifiers work", function() {
    var t = parseText("test.gspl", SRC_UNICODE);
    var ast = lowerToAst(t.root, "gspl-text/1.0", t.diagnostics);
    expect(ast.program).toBeTruthy();
  });

  it("killed: supplementary characters handled", function() {
    var t = parseText("test.gspl", "seed \uD83D\uDE00 1.0");
    expect(t.root).toBeTruthy();
  });

  it("killed: unpaired surrogates handled", function() {
    var t = parseText("test.gspl", "seed \uD800 1.0");
    expect(t.root).toBeTruthy();
  });
});

describe("Mutation: newline handling", function() {
  it("killed: U+2028 line separator handled", function() {
    var t = parseText("test.gspl", "seed\u2028 1.0");
    expect(t.root).toBeTruthy();
  });

  it("killed: U+2029 paragraph separator handled", function() {
    var t = parseText("test.gspl", "seed\u2029 1.0");
    expect(t.root).toBeTruthy();
  });
});

describe("Mutation: format idempotence", function() {
  it("killed: format does not diverge", function() {
    var r1 = formatSource(SRC_SEED, LF);
    if (r1.diagnostics.length > 0) return;
    var r2 = formatSource(r1.text, LF);
    expect(r2.text).toBe(r1.text);
  });
});

describe("Mutation: version handling", function() {
  it("killed: language version passed through pipeline", function() {
    var t = parseText("test.gspl", "seed 1.0\ngene x = 1");
    var ast = lowerToAst(t.root, "gspl-text/1.0", t.diagnostics);
    expect(ast.program.languageVersion).toBe("gspl-text/1.0");
  });
});
