#!/usr/bin/env node
/**
 * Genuine mutation testing harness.
 * Copies production source files, applies mutations, runs detecting tests,
 * records kill/survive, restores originals. Generates JSON report.
 */
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { fileURLToPath } from "node:url";

var __dirname = path.dirname(fileURLToPath(import.meta.url));
var REPO_ROOT = path.resolve(__dirname, "..");

interface Mutation {
  id: string;
  file: string;
  description: string;
  critical: boolean;
  search: RegExp;
  replace: string;
  detectingTest: string;
}

var MUTATIONS: Mutation[] = [
  // ====== Canonical lowering ======
  {
    id: "MUT-L-001", file: "packages/frontend/src/canonical-lowering.ts",
    description: "map unknown type to GS-001 silently", critical: true,
    search: /if \(mapped\) return mapped;/, replace: "if (mapped) return mapped; if (!mapped) return \"GS-001\" as GeneTypeId;",
    detectingTest: "packages/frontend/test/limits.test.ts"
  },
  {
    id: "MUT-L-002", file: "packages/frontend/src/canonical-lowering.ts",
    description: "emit seed after fatal errors", critical: true,
    search: /if \(hasFatalTypeError\) \{[^}]+\}/, replace: "if (hasFatalTypeError) { /* SURVIVED: seed still produced */ }",
    detectingTest: "packages/frontend/test/limits.test.ts"
  },
  // ====== Formatter ======
  {
    id: "MUT-F-001", file: "packages/frontend/src/formatter.ts",
    description: "discard leading trivia", critical: true,
    search: /for \(var j = 0; j < child\.leadingTrivia\.length; j\+\+\) \{[^}]+\}/,
    replace: "/* leading trivia discarded */",
    detectingTest: "packages/frontend/test/formatter-law.test.ts"
  },
  {
    id: "MUT-F-002", file: "packages/frontend/src/formatter.ts",
    description: "report changed=false always", critical: true,
    search: /var normOrig = normalizeNewlines\(original, nl\);/,
    replace: "var normOrig = normalizeNewlines(original, nl); var changed = false; /* skip comparison */ return { text: result, diagnostics: diags, changed: changed };",
    detectingTest: "packages/frontend/test/formatter-law.test.ts"
  },
  // ====== Binding ======
  {
    id: "MUT-B-001", file: "packages/frontend/src/binding.ts",
    description: "accept duplicates silently", critical: true,
    search: /ctx\.emit\('GSPL-BIND-DUPLICATE-DECLARATION',[^)]+\)/,
    replace: "/* duplicate declaration silently accepted */",
    detectingTest: "packages/frontend/test/binding.test.ts"
  },
  {
    id: "MUT-B-002", file: "packages/frontend/src/binding.ts",
    description: "accept unresolved references", critical: true,
    search: /ctx\.emit\('GSPL-BIND-UNRESOLVED-NAME',[^)]+\)/,
    replace: "/* unresolved reference silently accepted */",
    detectingTest: "packages/frontend/test/binding.test.ts"
  },
  // ====== Type analysis ======
  {
    id: "MUT-T-001", file: "packages/frontend/src/type-analysis.ts",
    description: "bypass type compatibility", critical: true,
    search: /return false;\n  \}/,
    replace: "return true;\n  }",
    detectingTest: "packages/frontend/test/type-analysis.test.ts"
  },
  // ====== Determinism ======
  {
    id: "MUT-D-001", file: "packages/frontend/src/binding.ts",
    description: "use Math.random for symbol IDs", critical: true,
    search: /return this\.symbolIdCounter\+\+ as SymbolId/,
    replace: "return (Math.random() * 1000000 | 0) as SymbolId",
    detectingTest: "packages/frontend/test/property.test.ts"
  },
];

var tmpDir = path.join(os.tmpdir(), "gspl-mutations-" + Date.now().toString(36));
fs.mkdirSync(tmpDir, { recursive: true });

interface ReportEntry {
  id: string; description: string; critical: boolean; file: string;
  killed: boolean; exitCode: number; survivorReason?: string; durationMs: number;
}
var report: ReportEntry[] = [];

function backupFile(filePath: string): string {
  var src = path.join(REPO_ROOT, filePath);
  var dst = path.join(tmpDir, path.basename(filePath));
  fs.copyFileSync(src, dst);
  return fs.readFileSync(src, "utf-8");
}

function restoreFile(filePath: string, content: string): void {
  fs.writeFileSync(path.join(REPO_ROOT, filePath), content, "utf-8");
}

for (var mi = 0; mi < MUTATIONS.length; mi++) {
  var m = MUTATIONS[mi];
  var origContent = backupFile(m.file);

  // Apply mutation
  var mutated = origContent.replace(m.search, m.replace);
  if (mutated === origContent) {
    report.push({ id: m.id, description: m.description, critical: m.critical,
      file: m.file, killed: false, exitCode: -1,
      survivorReason: "mutation pattern did not match", durationMs: 0 });
    console.error("MISSED " + m.id + ": pattern did not match");
    restoreFile(m.file, origContent);
    continue;
  }

  fs.writeFileSync(path.join(REPO_ROOT, m.file), mutated, "utf-8");

  // Run detecting test
  var start = Date.now();
  var r = spawnSync("npx", ["vitest", "run", m.detectingTest, "--reporter=verbose"], {
    cwd: REPO_ROOT, timeout: 30_000, encoding: "utf-8",
    shell: process.platform === "win32",
  });
  var dur = Date.now() - start;
  var exitCode = r.status ?? (r.signal ? 1 : 0);
  var killed = exitCode !== 0;

  var entry: ReportEntry = {
    id: m.id, description: m.description, critical: m.critical,
    file: m.file, killed, exitCode, durationMs: dur,
  };
  if (!killed) entry.survivorReason = "test returned exit code 0";
  report.push(entry);

  console.error((killed ? "KILLED " : "SURVIVED ") + m.id + ": " + m.description + " (" + dur + "ms)");

  // Restore
  restoreFile(m.file, origContent);
}

// Clean up backups
fs.rmSync(tmpDir, { recursive: true, force: true });

// Generate report
var killedCount = report.filter(function(e: ReportEntry) { return e.killed; }).length;
var survivedCount = report.filter(function(e: ReportEntry) { return !e.killed; }).length;
var criticalSurvivors = report.filter(function(e: ReportEntry) { return !e.killed && e.critical; });

var artifactsDir = path.join(REPO_ROOT, "artifacts", "validation");
fs.mkdirSync(artifactsDir, { recursive: true });
var json = {
  schema: "gspl.frontend-mutation-report",
  schemaVersion: "1.0",
  sourceCommit: "b4b8016",
  totalMutations: MUTATIONS.length,
  killed: killedCount, survived: survivedCount,
  criticalSurvivors: criticalSurvivors.length,
  mutationScore: MUTATIONS.length > 0 ? Math.round((killedCount / MUTATIONS.length) * 100) : 0,
  results: report,
};
fs.writeFileSync(path.join(artifactsDir, "prompt-3-frontend-mutation-report.json"), JSON.stringify(json, null, 2), "utf-8");

console.log(JSON.stringify({ killed: killedCount, survived: survivedCount, score: json.mutationScore, criticalSurvivors: criticalSurvivors.length }));

if (criticalSurvivors.length > 0) {
  process.exit(1);
}
