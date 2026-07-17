#!/usr/bin/env node
/**
 * Frontend limit coverage checker - Prompt 3 §13.
 * Validates the limit coverage artifact against required fields.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

var __dirname = path.dirname(fileURLToPath(import.meta.url));
var REPO_ROOT = path.resolve(__dirname, "..");

var artifactPath = path.join(REPO_ROOT, "artifacts", "validation", "prompt-3-frontend-limit-coverage.json");
if (!fs.existsSync(artifactPath)) {
  console.error("MISSING: " + artifactPath);
  process.exit(1);
}

var data = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
var limits = data.limits || [];

var requiredLimits = [
  "maxSourceBytes", "maxDecodedCodeUnits", "maxLines", "maxLineLength",
  "maxIdentifierCodeUnits", "maxStringCodeUnits", "maxCommentCodeUnits",
  "maxCommentNestingDepth", "maxNumericCodeUnits", "maxTriviaCodeUnits",
  "maxTokenCount", "maxDiagnostics"
];

var failed = false;
for (var ri = 0; ri < requiredLimits.length; ri++) {
  var rl = requiredLimits[ri];
  var found = limits.find(function(l: any) { return l.name === rl; });
  if (!found) {
    console.error("MISSING-LIMIT: " + rl);
    failed = true;
  } else if (!found.testFile) {
    console.error("UNTESTED-LIMIT: " + rl + " (no testFile)");
    failed = true;
  }
}

for (var li = 0; li < limits.length; li++) {
  var l = limits[li];
  if (requiredLimits.indexOf(l.name) < 0) {
    console.error("UNKNOWN-LIMIT: " + l.name);
    failed = true;
  }
}

console.log("LIMIT-COVERAGE: " + limits.length + "/" + requiredLimits.length + " limits covered");
if (failed) process.exit(1);
