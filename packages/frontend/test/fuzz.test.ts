/**
 * Frontend corpus fuzzer - Prompt 3 fuzz verification.
 * Deterministic seeded mutator over GSPL source corpora.
 * Mutation operators: byte insertion, deletion, replacement, duplication,
 * splice, truncation, delimiter corruption, escape corruption, radix corruption,
 * comment insertion, bidi/zero-width insertion, trivia runs, operator repetition.
 */
import { describe, it, expect } from "vitest";
import { parseText } from "@gspl/parser";
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

var SEED_CORPORA = [
  "seed 1.0\ngene x: scalar = 42\n",
  "seed 1.0\n  gene health: scalar = 100\n  gene name: string = \"hero\"\n  gene flag: boolean = true\n",
  "seed 1.0\n  gene sum: scalar = 1 + 2\n  gene diff: scalar = 10 - 3\n  gene prod: scalar = 4 * 5\n  gene quot: scalar = 20 / 2\n",
  "seed 1.0\n  gene x: scalar = 0xFF\n  gene pi: float = 3.14\n  gene none: absence = none\n",
  "seed 1.0\n  gene id: scalar = 42\n  // inline comment\n  gene name: string = \"test\"\n  /* block comment */\n  gene flag: boolean = false\n",
  "seed 1.0\n  import \"lib.gspl\"\n  export { x, y }\n  gene x: scalar = 1\n",
  "seed 1.0\n  require 10\n  forbid 99\n  invariant 50\n  gene x: scalar = 42\n",
];

function toBytes(s: string): number[] {
  var a: number[] = [];
  for (var i = 0; i < s.length; i++) a.push(s.charCodeAt(i));
  return a;
}
function fromBytes(b: number[]): string {
  var s = "";
  for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i] & 0xFFFF);
  return s;
}

var FUZZ_SEED = parseInt(process.env["FUZZ_SEED"] || "0xF22DBEEF", 10) || 0xF22DBEEF;
var FUZZ_ITERS = 2000;

function pickSeed(rng: () => number): string {
  return SEED_CORPORA[Math.floor(rng() * SEED_CORPORA.length)];
}

function mutate(bytes: number[], rng: () => number): number[] {
  var op = Math.floor(rng() * 14);
  var b = bytes.slice();
  var pos = Math.floor(rng() * b.length);

  switch (op) {
    case 0: // insert byte
      b.splice(pos, 0, Math.floor(rng() * 256));
      break;
    case 1: // delete byte
      if (b.length > 0) b.splice(pos, 1);
      break;
    case 2: // replace byte
      if (b.length > 0) b[pos] = Math.floor(rng() * 256);
      break;
    case 3: // duplicate range
      var len = Math.floor(rng() * Math.min(20, b.length - pos));
      if (len > 0) b.splice(pos, 0, ...b.slice(pos, pos + len));
      break;
    case 4: // splice ranges
      var p2 = Math.floor(rng() * b.length);
      var sub = b.splice(Math.min(pos, p2), Math.abs(p2 - pos));
      b.splice(Math.floor(rng() * b.length), 0, ...sub);
      break;
    case 5: // truncate
      b = b.slice(0, Math.max(1, Math.floor(rng() * b.length)));
      break;
    case 6: // corrupt quote delimiter
      for (var i = 0; i < b.length; i++) {
        if (b[i] === 0x22 && rng() < 0.3) b[i] = 0x27;
      }
      break;
    case 7: // corrupt radix prefix
      if (pos + 2 < b.length && b[pos] === 0x30) {
        b[pos + 1] = [0x78, 0x62, 0x6f, 0x67][Math.floor(rng() * 4)];
      }
      break;
    case 8: // insert comment
      b.splice(pos, 0, ...[0x20, 0x2f, 0x2f, 0x20, 0x66, 0x75, 0x7a, 0x7a, 0x20]);
      break;
    case 9: // bidi/zero-width insertion
      var zws = [0x200B, 0x200C, 0x200D, 0xFEFF, 0x200E, 0x200F];
      var zw = zws[Math.floor(rng() * zws.length)];
      if (zw < 0x10000) { b.splice(pos, 0, zw); }
      break;
    case 10: // corrupt escape
      if (b.length > 0) b[pos] = 0x5c;
      break;
    case 11: // repeat trivia
      var spaces = [0x20, 0x09];
      for (var j = 0; j < 50; j++) {
        b.splice(pos, 0, spaces[Math.floor(rng() * 2)]);
      }
      break;
    case 12: // repeat operators
      var ops = [0x2b, 0x2d, 0x2a, 0x2f];
      for (var k = 0; k < 10; k++) {
        b.splice(pos, 0, ops[Math.floor(rng() * 4)]);
      }
      break;
    case 13: // UTF-8 corruption (insert high byte)
      b.splice(pos, 0, 0x80 + Math.floor(rng() * 0x40));
      break;
  }
  return b.slice(0, 100000);
}

function runPipeline(source: string) {
  var p = parseText("fuzz.gspl", source);
  var ast = lowerToAst(p.root, "gspl-text/1.0", p.diagnostics);
  var b = bindProgramSymbols(ast.program);
  var env = createTypeEnvironment();
  var auth = lowerToAuthoring(ast.program, b, env, "fuzz.gspl");
  var can = lowerToCanonicalSeed(auth);
  var ir = compileAuthoringToIr(auth);
  return { parse: p, ast: ast, binding: b, authoring: auth, canonical: can, ir: ir };
}

describe("Fuzz Frontend pipeline (2k iters)", function() {
  it("F1: no crash, bounded, deterministic replay", function() {
    var rng = mulberry32(FUZZ_SEED);
    for (var i = 0; i < FUZZ_ITERS; i++) {
      var mutSeed = i;
      var src = pickSeed(rng);
      var bytes = toBytes(src);

      // Apply 1-3 mutations
      var chain = Math.floor(rng() * 3) + 1;
      for (var m = 0; m < chain; m++) {
        bytes = mutate(bytes, rng);
      }
      var mutated = fromBytes(bytes);

      var r1 = parseText("fuzz.gspl", mutated);

      // Invariant: parser terminates (no crash)
      expect(r1).toBeDefined();
      expect(r1.root).toBeDefined();
      expect(r1.diagnostics).toBeDefined();

      // Invariant: deterministic replay
      var r2 = parseText("fuzz.gspl", mutated);
      expect(r2.diagnostics.length).toBe(r1.diagnostics.length);

      // Invariant: AST lowering terminates
      var ast = lowerToAst(r1.root, "gspl-text/1.0", r1.diagnostics);
      expect(ast).toBeDefined();
      expect(ast.program).toBeDefined();

      // Invariant: binding terminates
      var b = bindProgramSymbols(ast.program);
      expect(b).toBeDefined();
      expect(typeof b.symbolCount).toBe("number");

      // Invariant: authoring terminates
      var env = createTypeEnvironment();
      var auth = lowerToAuthoring(ast.program, b, env, "fuzz.gspl");
      expect(auth).toBeDefined();

      // Invariant: canonical lowering terminates
      var can = lowerToCanonicalSeed(auth);
      expect(can).toBeDefined();

      // Invariant: IR lowering terminates
      var ir = compileAuthoringToIr(auth);
      expect(ir).toBeDefined();
    }
  });

  it("F2: valid source reconstructs deterministically", function() {
    var rng = mulberry32(FUZZ_SEED + 1);
    for (var i = 0; i < 500; i++) {
      var src = pickSeed(rng);
      var r1 = parseText("fuzz.gspl", src);
      var r2 = parseText("fuzz.gspl", src);
      // Same source, same diagnostics
      expect(r2.diagnostics.length).toBe(r1.diagnostics.length);
      // Same AST
      var a1 = lowerToAst(r1.root, "gspl-text/1.0", r1.diagnostics);
      var a2 = lowerToAst(r2.root, "gspl-text/1.0", r2.diagnostics);
      expect(a2.nodeCount).toBe(a1.nodeCount);
    }
  });

  it("F3: mutation chain is deterministic", function() {
    for (var i = 0; i < 200; i++) {
      var seed = (FUZZ_SEED + 2 + i * 137) | 0;
      var rng1 = mulberry32(seed);
      var rng2 = mulberry32(seed);
      // Use a separate source-picker to keep rng1/rng2 in sync
      var picker = mulberry32(seed);
      var src = SEED_CORPORA[Math.floor(picker() * SEED_CORPORA.length)];
      var b1 = mutate(toBytes(src), rng1);
      var b2 = mutate(toBytes(src), rng2);
      expect(b2.length).toBe(b1.length);
      expect(b2.join(",")).toBe(b1.join(","));
    }
  });
});
