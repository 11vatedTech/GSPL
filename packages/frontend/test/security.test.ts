/**
 * Frontend security tests - Prompt 3 security verification.
 * Source containment, malformed-input resistance, resource-exhaustion prevention.
 */
import { describe, it, expect } from "vitest";
import { parseText } from "@gspl/parser";
import { lowerToAst } from "../src/ast-lowering.js";
import { formatSource } from "../src/formatter.js";

// ============================================================
// Bidi and zero-width injection resistance
// ============================================================

describe("Bidi and zero-width input", function() {
  it("does not crash on bidi override characters", function() {
    var t = parseText("test.gspl", "seed \u202E 1.0");
    var ast = lowerToAst(t.root, "gspl-text/1.0", t.diagnostics);
    expect(ast.program).toBeTruthy();
  });

  it("does not crash on zero-width space", function() {
    var t = parseText("test.gspl", "seed\u200B 1.0");
    var ast = lowerToAst(t.root, "gspl-text/1.0", t.diagnostics);
    expect(ast.program).toBeTruthy();
  });

  it("does not crash on RTL override", function() {
    var t = parseText("test.gspl", "\u202Eseed 1.0");
    var ast = lowerToAst(t.root, "gspl-text/1.0", t.diagnostics);
    expect(ast.program).toBeTruthy();
  });

  it("does not crash on bidi isolates", function() {
    var t = parseText("test.gspl", "\u2066seed\u2069 1.0");
    var ast = lowerToAst(t.root, "gspl-text/1.0", t.diagnostics);
    expect(ast.program).toBeTruthy();
  });
});

// ============================================================
// Surrogate and invalid UTF-16 resistance
// ============================================================

describe("Invalid code unit resistance", function() {
  it("does not crash on isolated high surrogate", function() {
    var t = parseText("test.gspl", "seed \uD800 1.0");
    var ast = lowerToAst(t.root, "gspl-text/1.0", t.diagnostics);
    expect(ast.program).toBeTruthy();
  });

  it("does not crash on isolated low surrogate", function() {
    var t = parseText("test.gspl", "seed \uDC00 1.0");
    var ast = lowerToAst(t.root, "gspl-text/1.0", t.diagnostics);
    expect(ast.program).toBeTruthy();
  });

  it("does not crash on valid surrogate pair", function() {
    var t = parseText("test.gspl", "seed \uD83D\uDE00 1.0");
    var ast = lowerToAst(t.root, "gspl-text/1.0", t.diagnostics);
    expect(ast.program).toBeTruthy();
  });

  it("does not crash on multiple unpaired surrogates", function() {
    var t = parseText("test.gspl", "\uD800seed\uDC00 1.0");
    var ast = lowerToAst(t.root, "gspl-text/1.0", t.diagnostics);
    expect(ast.program).toBeTruthy();
  });
});

// ============================================================
// Resource exhaustion prevention
// ============================================================

describe("Resource bound enforcement", function() {
  it("handles very long source without OOM", function() {
    var long = "seed 1.0\n" + "gene a = 1\n".repeat(1000);
    var t = parseText("test.gspl", long);
    expect(t.root).toBeTruthy();
  });

  it("handles deeply nested expressions", function() {
    var nested = "seed 1.0\ngene x = " + "(".repeat(200) + "1" + ")".repeat(200);
    var r = parseText("test.gspl", nested);
    expect(r.root).toBeTruthy();
  });

  it("handles repeated formatting without growth", function() {
    var src = "seed 1.0\ngene a = 1\ngene b = 2";
    var r1 = formatSource(src, { newline: "lf", trailingNewline: true });
    if (r1.diagnostics.length > 0) return;
    var r2 = formatSource(r1.text, { newline: "lf", trailingNewline: true });
    expect(r2.text.length).toBeLessThanOrEqual(r1.text.length + 10);
  });
});

// ============================================================
// Path traversal resistance
// ============================================================

describe("Path traversal resistance", function() {
  it("does not crash on relative path escapes in import", function() {
    var src = 'import "../../../etc/passwd"';
    var t = parseText("test.gspl", src);
    expect(t.root).toBeTruthy();
  });

  it("does not crash on null bytes in source", function() {
    var src = "seed 1.0\0gene x = 1";
    var t = parseText("test.gspl", src);
    expect(t.root).toBeTruthy();
  });

  it("does not crash on absolute paths in import", function() {
    var src = 'import "/etc/passwd"';
    var t = parseText("test.gspl", src);
    expect(t.root).toBeTruthy();
  });
});
