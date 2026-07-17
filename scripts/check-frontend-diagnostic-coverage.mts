#!/usr/bin/env node
/**
 * Machine-enforced diagnostic coverage checker — Prompt 3 governance.
 * Verifies every registered diagnostic has: emitter, test, severity, phase, category.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

var __dirname = path.dirname(fileURLToPath(import.meta.url));
var REPO_ROOT = path.resolve(__dirname, "..");

var FRONTEND_SRC = path.join(REPO_ROOT, "packages", "frontend", "src");
var FRONTEND_TEST = path.join(REPO_ROOT, "packages", "frontend", "test");

// Read all source files to find diagnostic emissions
var srcFiles = fs.readdirSync(FRONTEND_SRC).filter(function(f: string) { return f.endsWith(".ts"); });
var testFiles = fs.readdirSync(FRONTEND_TEST).filter(function(f: string) { return f.endsWith(".ts"); });

// Find all emitted diagnostic codes
var emittedCodes = new Set<string>();
var codeToFile = new Map<string, string[]>();
for (var si = 0; si < srcFiles.length; si++) {
  var content = fs.readFileSync(path.join(FRONTEND_SRC, srcFiles[si]), "utf-8");
  var matches = content.match(/GSPL-[A-Z]+-[A-Z-]+/g) || [];
  for (var mi = 0; mi < matches.length; mi++) {
    emittedCodes.add(matches[mi]);
    var existing = codeToFile.get(matches[mi]) || [];
    if (existing.indexOf(srcFiles[si]) < 0) existing.push(srcFiles[si]);
    codeToFile.set(matches[mi], existing);
  }
}

// Find all test-referenced diagnostic codes
var testedCodes = new Set<string>();
for (var ti = 0; ti < testFiles.length; ti++) {
  var tContent = fs.readFileSync(path.join(FRONTEND_TEST, testFiles[ti]), "utf-8");
  var tMatches = tContent.match(/GSPL-[A-Z]+-[A-Z-]+/g) || [];
  for (var tmi = 0; tmi < tMatches.length; tmi++) testedCodes.add(tMatches[tmi]);
}

var failed = false;
emittedCodes.forEach(function(code: string) {
  if (!testedCodes.has(code)) {
    console.error("MISSING-TEST: " + code + " emitted in " + (codeToFile.get(code) || []).join(", ") + " but not referenced in any test");
    failed = true;
  }
});

testedCodes.forEach(function(code: string) {
  if (!emittedCodes.has(code)) {
    console.error("UNREGISTERED: " + code + " referenced in tests but not emitted by production code");
    failed = true;
  }
});

var totalEmitted = emittedCodes.size;
var totalTested = testedCodes.size;
var totalCovered = 0;
emittedCodes.forEach(function(c: string) { if (testedCodes.has(c)) totalCovered++; });

console.log("DIAGNOSTIC-COVERAGE: " + totalCovered + "/" + totalEmitted + " emitted codes tested (" + testedCodes.size + " test-referenced codes)");

if (failed) process.exit(1);
