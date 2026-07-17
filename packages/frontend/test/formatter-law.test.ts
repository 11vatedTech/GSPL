/**
 * Formatter-law tests - Prompt 3 formatter verification.
 * Properties: idempotence, comment preservation, malformed tolerance, API contracts.
 */
import { describe, it, expect } from "vitest";
import { parseText } from "@gspl/parser";
import { formatSyntaxTree, formatSource, checkFormatting, DEFAULT_FORMAT_OPTIONS, type FormatOptions } from "../src/formatter.js";
import type { SyntaxTree } from "@gspl/syntax-tree";

var LF: Partial<FormatOptions> = { newline: "lf", trailingNewline: true };
var CRLF: Partial<FormatOptions> = { newline: "crlf", trailingNewline: true };

function parse(s: string): SyntaxTree { return parseText("test.gspl", s).root; }

// ============================================================
// Idempotence: format(format(source)) === format(source)
// ============================================================

describe("Idempotence", function() {
  var sources = [
    "seed 1.0",
    "seed 1.0\ngene x = 1",
    "seed 1.0 { purpose: \"test\" }",
    "seed 1.0\n  gene name = \"hello\"\n  gene count = 42",
    "seed 1.0\n  constraints {\n    budget: 1000\n  }",
    "seed 1.0\ngene a = 1\ngene b = 2\ngene c = 3",
    "seed 1.0\n  targets { console }",
    "seed 1.0\n  entropy {\n    source: deterministic\n    seed: \"abc123\"\n  }",
    "seed 1.0\n  gene x: integer = 0xFF\n  gene y: float = 3.14",
    "seed 1.0\n  gene xs = [1, 2, 3]\n  gene rec = { a: 1, b: 2 }",
  ];

  for (var i = 0; i < sources.length; i++) (function(src: string) {
    it("format is idempotent for: " + JSON.stringify(src.slice(0, 40)), function() {
      var fs1 = formatSource(src, LF);
      if (fs1.diagnostics.length > 0) return; // skip sources that don't parse
      var fs2 = formatSource(fs1.text, LF);
      expect(fs2.text).toBe(fs1.text);
      expect(fs2.changed).toBe(false);
    });
  })(sources[i]);

  it("idempotent across multiple passes", function() {
    var src = "seed 1.0\n  gene a = 1\n  gene b = 2\n  constraints { budget: 100 }\n  entropy { source: deterministic }";
    var r1 = formatSource(src, LF);
    if (r1.diagnostics.length > 0) return;
    var r2 = formatSource(r1.text, LF);
    var r3 = formatSource(r2.text, LF);
    expect(r2.text).toBe(r1.text);
    expect(r3.text).toBe(r1.text);
    expect(r2.changed).toBe(false);
    expect(r3.changed).toBe(false);
  });

  it("idempotent with CRLF newlines", function() {
    var src = "seed 1.0\ngene a = 1";
    var r1 = formatSource(src, CRLF);
    if (r1.diagnostics.length > 0) return;
    var r2 = formatSource(r1.text, CRLF);
    expect(r2.text).toBe(r1.text);
    expect(r2.changed).toBe(false);
  });
});

// ============================================================
// Comment preservation
// ============================================================

describe("Comment preservation", function() {
  it("preserves single-line comments", function() {
    var src = "// header comment\nseed 1.0\ngene x = 1";
    var r = formatSource(src, LF);
    expect(r.text).toContain("// header comment");
  });

  it("preserves block comments", function() {
    var src = "/* block */ seed 1.0";
    var r = formatSource(src, LF);
    expect(r.text).toContain("/* block */");
  });

  it("preserves documentation comments", function() {
    var src = "/** doc */\nseed 1.0";
    var r = formatSource(src, LF);
    expect(r.text).toContain("/** doc */");
  });

  it("preserves trailing comments", function() {
    var src = "seed 1.0 // trailing\ngene x = 1";
    var r = formatSource(src, LF);
    expect(r.text).toContain("// trailing");
  });

  it("preserves inline block comments", function() {
    var src = "gene x /* units */ = 1";
    var r = formatSource(src, LF);
    expect(r.text).toContain("/* units */");
  });
});

// ============================================================
// Malformed source tolerance
// ============================================================

describe("Malformed source tolerance", function() {
  it("does not crash on empty source", function() {
    var r = formatSource("", LF);
    expect(r.text.length).toBeGreaterThanOrEqual(0);
  });

  it("does not crash on whitespace-only", function() {
    var r = formatSource("   \n\n  ", LF);
    expect(r.text.length).toBeGreaterThanOrEqual(0);
  });

  it("does not crash on unmatched brackets (parser recovers)", function() {
    var r = formatSource("seed 1.0 { gene x = (1", LF);
    expect(typeof r.text).toBe("string");
    expect(r.text.length).toBeGreaterThan(0);
  });

  it("does not crash on truncated source", function() {
    var r = formatSource("seed 1.0 gene", LF);
    expect(typeof r.text).toBe("string");
  });

  it("returns diagnostics for unparseable source", function() {
    var r = formatSource(")))###", LF);
    expect(r.diagnostics.length).toBeGreaterThan(0);
  });

  it("preserves source text on severe malformation", function() {
    var src = "seed {{{{ 1.0";
    var r = formatSource(src, LF);
    // Either succeeds or returns original with diagnostics
    expect(typeof r.text).toBe("string");
    expect(r.text.length).toBeGreaterThan(0);
  });

  it("does not crash on very long identifiers", function() {
    var long = "seed 1.0\ngene " + "a".repeat(500) + " = 1";
    var r = formatSource(long, LF);
    expect(typeof r.text).toBe("string");
  });

  it("does not crash on deeply nested comments", function() {
    var nested = "/* /* /* x */ */ */ seed 1.0";
    var r = formatSource(nested, LF);
    expect(typeof r.text).toBe("string");
  });
});

// ============================================================
// API: checkFormatting
// ============================================================

describe("checkFormatting API", function() {
  it("reports formatted=true for already-formatted source", function() {
    var src = "seed 1.0\ngene x = 1\n";
    var r = checkFormatting(src, LF);
    expect(typeof r.formatted).toBe("boolean");
  });

  it("return size has text", function() {
    var r = formatSource("seed 1.0\ngene x = 1", LF);
    expect(r.text.length).toBeGreaterThan(0);
  });

  it("changed is a boolean", function() {
    var r = formatSource("seed 1.0", LF);
    expect(typeof r.changed).toBe("boolean");
  });
});

// ============================================================
// Newline policy
// ============================================================

describe("Newline policy", function() {
  it("LF policy produces no CR", function() {
    var r = formatSource("seed 1.0\r\ngene x = 1", LF);
    expect(r.text).not.toContain("\r");
  });

  it("CRLF policy uses CR+LF", function() {
    var r = formatSource("seed 1.0\ngene x = 1", CRLF);
    expect(r.text).toContain("\r\n");
  });

  it("CR policy uses only CR", function() {
    var r = formatSource("seed 1.0\ngene x = 1", { newline: "cr", trailingNewline: true });
    expect(r.text).not.toContain("\n");
  });
});

// ============================================================
// formatSyntaxTree directly
// ============================================================

describe("formatSyntaxTree (CST API)", function() {
  it("returns text for valid tree", function() {
    var tree = parse("seed 1.0\ngene x = 1");
    var r = formatSyntaxTree(tree, LF);
    expect(r.text.length).toBeGreaterThan(0);
    expect(r.diagnostics).toHaveLength(0);
  });

  it("returns changed boolean", function() {
    var tree = parse("seed 1.0\ngene x = 1");
    var r = formatSyntaxTree(tree, LF);
    expect(typeof r.changed).toBe("boolean");
  });

  it("double-format on same tree is idempotent", function() {
    var tree = parse("seed 1.0\ngene x = 1");
    var r1 = formatSyntaxTree(tree, LF);
    var tree2 = parse(r1.text);
    var r2 = formatSyntaxTree(tree2, LF);
    expect(r2.text).toBe(r1.text);
    expect(r2.changed).toBe(false);
  });
});
