/**
 * Governed frontend fixture generator - Prompt 3 §15.
 * Produces deterministic JSON outputs for each .gspl fixture.
 * Runs via vitest for workspace module resolution.
 */
import { describe, it, expect } from "vitest";
import { parseText } from "@gspl/parser";
import { lowerToAst, bindProgramSymbols, createTypeEnvironment, lowerToAuthoring, lowerToCanonicalSeed, compileAuthoringToIr, formatSource } from "@gspl/frontend";
import * as fs from "node:fs";
import * as path from "node:path";

import { fileURLToPath } from "node:url";
var __dirname = path.dirname(fileURLToPath(import.meta.url));
var REPO_ROOT = path.resolve(__dirname, "..");

var fixtures = [
  { name: "minimal.gspl", text: "seed 1.0\ngene x = 1" },
  { name: "comments.gspl", text: "// header\nseed 1.0 /* inline */ gene x = 1" },
  { name: "unicode-identifiers.gspl", text: "seed 1.0\ngene αlpha = 1" },
  { name: "numeric-literals.gspl", text: "seed 1.0\ngene a = 1\ngene b = 1.5\ngene c = 0xFF" },
  { name: "string-literals.gspl", text: "seed 1.0\ngene name = hello" },
  { name: "operators.gspl", text: "seed 1.0\ngene x = 1 + 2\ngene y = x * 3" },
  { name: "keywords.gspl", text: "seed 1.0\ngene t = true\ngene f = false\ngene n = none" },
];

var outDir = path.join(REPO_ROOT, "artifacts", "fixtures", "frontend");

for (var i = 0; i < fixtures.length; i++) (function(f: any) {
  describe("Fixture: " + f.name, function() {
    it("generates deterministic output", function() {
      fs.mkdirSync(outDir, { recursive: true });
      var t = parseText(f.name, f.text);
      var ast = lowerToAst(t.root, "gspl-text/1.0", t.diagnostics);
      var binding = bindProgramSymbols(ast.program);
      var types = createTypeEnvironment();
      var authoring = lowerToAuthoring(ast.program, binding, types, f.name);
      var canon = lowerToCanonicalSeed(authoring, { languageVersion: "gspl-text/1.0", domainId: "fixture", author: "fixtures" });
      var ir = compileAuthoringToIr(authoring);
      var fmt = formatSource(f.text, { newline: "lf", trailingNewline: true });

      var output = {
        fixture: f.name,
        sourceText: f.text,
        sourceLength: f.text.length,
        tokenCount: t.root.root.children.length,
        astNodeCount: ast.nodeCount,
        symbolCount: binding.symbolCount,
        scopeCount: binding.scopeCount,
        canonicalOk: canon.ok,
        canonicalContentId: canon.seed?.identity.contentId || "",
        canonicalGeneCount: canon.seed ? Object.keys((canon.seed as any).payload?.genes || {}).length : 0,
        irOk: ir.ok,
        irNodeCount: ir.ir?.nodes?.size || 0,
        diagnosticCount: t.diagnostics.length + binding.diagnostics.length + canon.diagnostics.length,
        desugaringCount: canon.desugaringTrace.length,
        normalizationCount: canon.normalizationTrace.length,
        formattedChanged: fmt.changed,
        formattedLength: fmt.text.length,
      };

      var outPath = path.join(outDir, f.name.replace(".gspl", ".json"));
      fs.writeFileSync(outPath, JSON.stringify(output, null, 2), "utf-8");

      expect(output.sourceLength).toBeGreaterThan(0);
      expect(output.astNodeCount).toBeGreaterThan(0);
    });
  });
})(fixtures[i]);
