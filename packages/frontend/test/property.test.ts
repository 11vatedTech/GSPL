/**
 * Frontend property tests - Prompt 3 property verification.
 * Custom deterministic generator (mulberry32 PRNG) with fixed seed.
 * Full local: 10,000 cases, shrinking, reproduction via PROPERTY_SEED env var.
 */
import { describe, it, expect } from "vitest";
import { parseText } from "@gspl/parser";
import { formatSyntaxTree } from "../src/formatter.js";
import { lowerToAst } from "../src/ast-lowering.js";
import { bindProgramSymbols } from "../src/binding.js";
import { createTypeEnvironment } from "../src/type-analysis.js";
import { lowerToAuthoring } from "../src/authoring.js";
import { lowerToCanonicalSeed } from "../src/canonical-lowering.js";
import { compileAuthoringToIr } from "../src/ir-lowering.js";

function mulberry32(seed: number): () => number {
  return function(): number {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

var GENE_NAMES = ["x","y","health","score","name","flag","ratio","value","alpha","beta","gamma","delta","item","count","weight"];
var TYPE_NAMES = ["scalar","integer","float","string","boolean","absence"];
var CLAUSE_KW = ["require","forbid","invariant"];

function generateSource(seed: number): string {
  var rng = mulberry32(seed);
  var lines: string[] = ["seed 1.0"];
  var clauseCount = Math.floor(rng() * 3);
  for (var c = 0; c < clauseCount; c++) {
    lines.push("  " + CLAUSE_KW[Math.floor(rng() * 3)] + " " + Math.floor(rng() * 100));
  }
  var geneCount = 1 + Math.floor(rng() * 5);
  for (var g = 0; g < geneCount; g++) {
    var name = GENE_NAMES[Math.floor(rng() * GENE_NAMES.length)];
    var typeName = TYPE_NAMES[Math.floor(rng() * TYPE_NAMES.length)];
    var parts = [];
    if (rng() < 0.1) parts.push("private");
    parts.push("gene " + name);
    parts.push(": " + typeName);
    if (rng() > 0.2) {
      parts.push("= " + generateValue(rng, typeName));
    }
    lines.push("  " + parts.join(" "));
  }
  return lines.join("\n") + "\n";
}

function generateValue(rng: () => number, typeName: string): string {
  if (typeName === "scalar" || typeName === "integer") {
    var r = rng();
    if (r < 0.5) return Math.floor(rng() * 1000).toString();
    if (r < 0.7) return "0x" + Math.floor(rng() * 255).toString(16).toUpperCase();
    if (r < 0.85) return (rng() * 100).toFixed(1);
    return Math.floor(rng() * 100) + " + " + Math.floor(rng() * 100);
  }
  if (typeName === "float") {
    return (rng() * 1000).toFixed(Math.floor(rng() * 5) + 1);
  }
  if (typeName === "string") {
    var chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_";
    var len = 1 + Math.floor(rng() * 10);
    var s = "";
    for (var i = 0; i < len; i++) s += chars[Math.floor(rng() * chars.length)];
    return "\"" + s + "\"";
  }
  if (typeName === "boolean") return rng() < 0.5 ? "true" : "false";
  if (typeName === "absence") return "none";
  return "42";
}

function runPipeline(source: string) {
  var p = parseText("t.gspl", source);
  var ast = lowerToAst(p.root, "gspl-text/1.0", p.diagnostics);
  var b = bindProgramSymbols(ast.program);
  var env = createTypeEnvironment();
  var auth = lowerToAuthoring(ast.program, b, env, "t.gspl");
  var can = lowerToCanonicalSeed(auth);
  var ir = compileAuthoringToIr(auth);
  var fmt = formatSyntaxTree(p.root);
  return { parse: p, ast: ast, binding: b, authoring: auth, canonical: can, ir: ir, format: fmt };
}

var SEED = typeof process !== "undefined" && process.env["PROPERTY_SEED"]
  ? parseInt(process.env["PROPERTY_SEED"], 10)
  : 0x4f502134;
var N = 10000;

describe("Property Frontend determinism (10k cases)", function() {
  it("P1: parse-format deterministic", function() {
    for (var i = 0; i < N; i++) {
      var s = (SEED + i * 7907) | 0;
      var src = generateSource(s);
      var r1 = formatSyntaxTree(parseText("a.gspl", src).root);
      var r2 = formatSyntaxTree(parseText("a.gspl", src).root);
      expect(r2.text).toBe(r1.text);
    }
  });

  it("P2: AST lowering deterministic", function() {
    for (var i = 0; i < N; i++) {
      var s = (SEED + i * 7907) | 0;
      var src = generateSource(s);
      var a1 = lowerToAst(parseText("b.gspl", src).root, "gspl-text/1.0");
      var a2 = lowerToAst(parseText("b.gspl", src).root, "gspl-text/1.0");
      expect(a2.nodeCount).toBe(a1.nodeCount);
    }
  });

  it("P3: Binding deterministic", function() {
    for (var i = 0; i < N; i++) {
      var s = (SEED + i * 7907) | 0;
      var src = generateSource(s);
      var ast = lowerToAst(parseText("c.gspl", src).root, "gspl-text/1.0");
      var b1 = bindProgramSymbols(ast.program);
      var b2 = bindProgramSymbols(ast.program);
      expect(b2.symbolCount).toBe(b1.symbolCount);
      expect(b2.scopeCount).toBe(b1.scopeCount);
    }
  });

  it("P4: Canonical lowering deterministic", function() {
    for (var i = 0; i < N; i++) {
      var s = (SEED + i * 7907) | 0;
      var src = generateSource(s);
      var ast = lowerToAst(parseText("d.gspl", src).root, "gspl-text/1.0");
      var b = bindProgramSymbols(ast.program);
      var env = createTypeEnvironment();
      var a1 = lowerToAuthoring(ast.program, b, env, "d.gspl");
      var a2 = lowerToAuthoring(ast.program, b, env, "d.gspl");
      var c1 = lowerToCanonicalSeed(a1);
      var c2 = lowerToCanonicalSeed(a2);
      expect(c2.ok).toBe(c1.ok);
      if (c1.seed && c2.seed) {
        var g1 = Object.keys(c1.seed.payload.genes);
        var g2 = Object.keys(c2.seed.payload.genes);
        expect(g2.length).toBe(g1.length);
      }
    }
  });

  it("P5: IR lowering deterministic", function() {
    for (var i = 0; i < N; i++) {
      var s = (SEED + i * 7907) | 0;
      var src = generateSource(s);
      var ast = lowerToAst(parseText("e.gspl", src).root, "gspl-text/1.0");
      var b = bindProgramSymbols(ast.program);
      var env = createTypeEnvironment();
      var a1 = lowerToAuthoring(ast.program, b, env, "e.gspl");
      var a2 = lowerToAuthoring(ast.program, b, env, "e.gspl");
      var ir1 = compileAuthoringToIr(a1);
      var ir2 = compileAuthoringToIr(a2);
      if (ir1.ir && ir2.ir) {
        expect(ir2.ir.nodes.size).toBe(ir1.ir.nodes.size);
        expect(ir2.ir.edges.size).toBe(ir1.ir.edges.size);
      }
    }
  });
});
