#!/usr/bin/env node
/**
 * Cross-process frontend determinism checker - Prompt 3 determinism gate.
 * Spawns two separate vitest runs under different env vars and compares
 * actual JSON outputs from the pipeline.
 */
import { spawnSync } from "node:child_process";
import * as path from "node:path";
import * as fs from "node:fs";
import * as os from "node:os";
import { fileURLToPath } from "node:url";

var __dirname = path.dirname(fileURLToPath(import.meta.url));
var REPO_ROOT = path.resolve(__dirname, "..");

// Write runner to temp directory to avoid source tree pollution
var tmpDir = path.join(os.tmpdir(), "gspl-determinism-" + Math.random().toString(36).slice(2, 8));
fs.mkdirSync(tmpDir, { recursive: true });
var DET_SCRIPT = path.join(tmpDir, "runner.test.ts");

var runnerContent = `// Auto-generated determinism runner - run by gspl check:frontend-determinism
import { it, expect } from "vitest";
import { parseText } from "@gspl/parser";
import { lowerToAst, bindProgramSymbols, createTypeEnvironment, lowerToAuthoring, lowerToCanonicalSeed } from "@gspl/frontend";

var fixtures = [
  { name: "minimal", text: "seed 1.0\\ngene x = 1" },
  { name: "unicode", text: "seed 1.0\\ngene \\u03B1lpha = 1" },
  { name: "multiline", text: "seed 1.0 /* comment */\\n  gene x = 1" },
  { name: "keywords", text: "seed 1.0\\ngene t = true\\ngene f = false\\ngene n = none" },
  { name: "numeric", text: "seed 1.0\\ngene a = 1\\ngene b = 1.5\\ngene c = 0xFF" },
  { name: "mixed-newlines", text: "seed 1.0\\r\\ngene x = 1\\ngene y = 2\\r" },
  { name: "malformed", text: "seed {{{ 1.0" },
  { name: "empty", text: "" },
];

var results: Record<string, unknown> = {};

for (var fx of fixtures) {
  var t = parseText(fx.name + ".gspl", fx.text);
  var ast = lowerToAst(t.root, "gspl-text/1.0", t.diagnostics);
  var binding = bindProgramSymbols(ast.program);
  var types = createTypeEnvironment();
  var auth = lowerToAuthoring(ast.program, binding, types, fx.name + ".gspl");
  var canon = lowerToCanonicalSeed(auth, { languageVersion: "gspl-text/1.0", domainId: "test", author: "det" });

  // Store all deterministic outputs for cross-process comparison
  results[fx.name] = {
    nodeCount: ast.nodeCount,
    symbolCount: binding.symbolCount,
    scopeCount: binding.scopeCount,
    diagCount: t.diagnostics.length,
    contentId: canon.seed?.identity.contentId || "",
    ok: canon.ok,
    bindingDiags: binding.diagnostics.length,
  };

  it("deterministic: " + fx.name, function() {
    expect(ast.nodeCount).toBeGreaterThanOrEqual(0);
    expect(binding.symbolCount).toBeGreaterThanOrEqual(0);
    if (canon.seed && canon.seed.identity.contentId) {
      expect(canon.seed.identity.contentId.length).toBeGreaterThan(10);
    }
  });
}

// Output JSON for cross-process comparison
console.log("GSPL_DET_RESULT:" + JSON.stringify(results));
`;
fs.writeFileSync(DET_SCRIPT, runnerContent, "utf-8");

function runProcess(instance: string, tz: string, lang: string): { exitCode: number; stdout: string; stderr: string } {
  var r = spawnSync("npx", ["vitest", "run", DET_SCRIPT, "--reporter=verbose"], {
    env: { ...process.env, TZ: tz, LANG: lang, LC_ALL: lang, DETERMINISM_INSTANCE: instance, HOME: instance === "A" ? "/tmp/a" : "/tmp/b" },
    cwd: REPO_ROOT,
    timeout: 30_000,
    encoding: "utf-8",
    shell: process.platform === "win32",
  });
  return { exitCode: r.status ?? (r.signal ? 1 : 0), stdout: r.stdout || "", stderr: r.stderr || "" };
}

// Run both processes
var rA = runProcess("A", "UTC", "C");
var rB = runProcess("B", "America/New_York", "en_US.UTF-8");

// Clean up temp runner
try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) { /* ok */ }

// Extract JSON results from vitest output
function extractJson(out: string): Record<string, unknown> | null {
  var marker = "GSPL_DET_RESULT:";
  var idx = out.indexOf(marker);
  if (idx < 0) return null;
  try { return JSON.parse(out.slice(idx + marker.length).split("\n")[0]); } catch (e) { return null; }
}

var jsonA = extractJson(rA.stdout);
var jsonB = extractJson(rB.stdout);

if (rA.exitCode !== 0) {
  console.error("DETERMINISM FAILED: Process A (UTC) exited " + rA.exitCode);
  console.error(rA.stderr.slice(-500));
  process.exit(1);
}
if (rB.exitCode !== 0) {
  console.error("DETERMINISM FAILED: Process B (NY) exited " + rB.exitCode);
  console.error(rB.stderr.slice(-500));
  process.exit(1);
}
if (!jsonA || !jsonB) {
  console.error("DETERMINISM FAILED: Could not extract JSON results");
  console.error("A stdout tail:", rA.stdout.slice(-200));
  console.error("B stdout tail:", rB.stdout.slice(-200));
  process.exit(1);
}

// Compare results fixture-by-fixture
var aStr = JSON.stringify(jsonA);
var bStr = JSON.stringify(jsonB);
if (aStr !== bStr) {
  // Detailed diff
  var keysA = Object.keys(jsonA);
  for (var kii = 0; kii < keysA.length; kii++) {
    var k = keysA[kii];
    var va = JSON.stringify((jsonA as any)[k]);
    var vb = JSON.stringify((jsonB as any)[k]);
    if (va !== vb) {
      console.error("DETERMINISM MISMATCH for fixture:", k);
      console.error("  A:", va);
      console.error("  B:", vb);
    }
  }
  process.exit(1);
}

console.log("DETERMINISM PASSED: " + Object.keys(jsonA).length + "/" + Object.keys(jsonA).length + " fixtures match across processes (TZ=" + "UTC" + " vs " + "America/New_York" + ")");
