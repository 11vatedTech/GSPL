#!/usr/bin/env node
/**
 * GSPL CLI — Prompt 3 command-line interface.
 * Commands: lex, parse, check, format, lower, ir, explain.
 */
import { parseText, type ParseResult } from "@gspl/parser";
import { lowerToAst, bindProgramSymbols, createTypeEnvironment, lowerToAuthoring, lowerToCanonicalSeed, compileAuthoringToIr, formatSource, explainGraph, createProvenanceGraph, validateStructure, type CanonicalLoweringResult, type FormatResult } from "@gspl/frontend";
import type { AuthoringProgram } from "@gspl/frontend";
import * as fs from "node:fs";
import * as path from "node:path";

var args = process.argv.slice(2);
var cmd = args[0];
var targets = args.slice(1);

if (!cmd || cmd === "help" || cmd === "--help") {
  console.log("gspl <command> [files...]");
  console.log("  lex     — tokenize source");
  console.log("  parse   — parse to CST");
  console.log("  check   — parse + bind + type-check");
  console.log("  format  — format source");
  console.log("  lower   — lower to canonical seed");
  console.log("  ir      — lower to GSPL IR");
  console.log("  explain — provenance query");
  process.exit(0);
}

function readSource(filePath: string): string {
  if (filePath === "-") {
    // Read from stdin
    try { return fs.readFileSync(0, "utf-8"); } catch (e) { return ""; }
  }
  return fs.readFileSync(filePath, "utf-8");
}

function getLogicalPath(filePath: string): string {
  if (filePath === "-") return "<stdin>";
  return path.basename(filePath);
}

function runCommand(fn: (src: string, lp: string) => string): void {
  var files = targets.length > 0 ? targets : ["-"];
  var exitCode = 0;
  for (var i = 0; i < files.length; i++) {
    try {
      var src = readSource(files[i]);
      var lp = getLogicalPath(files[i]);
      var out = fn(src, lp);
      console.log(out);
      if (out.indexOf('"severity":"error"') >= 0) exitCode = 1;
    } catch (e: any) {
      console.error("gspl:", cmd, files[i] + ":", e.message || String(e));
      exitCode = 2;
    }
  }
  process.exit(exitCode);
}

switch (cmd) {
  case "lex":
    runCommand(function(src: string, lp: string): string {
      var t = parseText(lp, src);
      return JSON.stringify({ sourceId: t.root.sourceId, tokenCount: t.root.root.children.length, diagnostics: t.diagnostics.map(function(d: any) { return { code: d.code, severity: d.severity, span: d.span }; }) }, null, 2);
    });
    break;
  case "parse":
    runCommand(function(src: string, lp: string): string {
      var t = parseText(lp, src);
      return JSON.stringify({ sourceId: t.root.sourceId, nodeKind: t.root.root.kind, childCount: t.root.root.children.length, diagnostics: t.diagnostics.map(function(d: any) { return { code: d.code, severity: d.severity, message: d.message }; }) }, null, 2);
    });
    break;
  case "check":
    runCommand(function(src: string, lp: string): string {
      var t = parseText(lp, src);
      var ast = lowerToAst(t.root, "gspl-text/1.0", t.diagnostics);
      var binding = bindProgramSymbols(ast.program);
      var types = createTypeEnvironment();
      var result = validateStructure(ast.program, types);
      var allDiags = [...t.diagnostics, ...binding.diagnostics, ...(result.diagnostics || [])];
      return JSON.stringify({ ok: allDiags.filter(function(d: any) { return d.severity === "error"; }).length === 0, nodeCount: ast.nodeCount, symbolCount: binding.symbolCount, diagnostics: allDiags.map(function(d: any) { return { code: d.code, severity: d.severity }; }) }, null, 2);
    });
    break;
  case "format":
    runCommand(function(src: string, lp: string): string {
      var r = formatSource(src, { newline: "lf", trailingNewline: true });
      if (r.diagnostics.length > 0 && r.diagnostics.some(function(d: any) { return d.severity === "error"; })) {
        console.error(JSON.stringify(r.diagnostics, null, 2));
      }
      return r.text;
    });
    break;
  case "lower":
    runCommand(function(src: string, lp: string): string {
      var t = parseText(lp, src);
      var ast = lowerToAst(t.root, "gspl-text/1.0", t.diagnostics);
      var binding = bindProgramSymbols(ast.program);
      var types = createTypeEnvironment();
      var authoring = lowerToAuthoring(ast.program, binding, types, lp);
      var canon = lowerToCanonicalSeed(authoring, { languageVersion: "gspl-text/1.0", domainId: "cli", author: "gspl-cli" });
      return JSON.stringify({ ok: canon.ok, geneCount: canon.seed ? Object.keys((canon.seed as any).payload?.genes || {}).length : 0, contentId: canon.seed?.identity.contentId, diagnostics: canon.diagnostics.map(function(d: any) { return { code: d.code, severity: d.severity }; }) }, null, 2);
    });
    break;
  case "ir":
    runCommand(function(src: string, lp: string): string {
      var t = parseText(lp, src);
      var ast = lowerToAst(t.root, "gspl-text/1.0", t.diagnostics);
      var binding = bindProgramSymbols(ast.program);
      var types = createTypeEnvironment();
      var authoring = lowerToAuthoring(ast.program, binding, types, lp);
      var ir = compileAuthoringToIr(authoring);
      return JSON.stringify({ ok: ir.ok, nodeCount: ir.ir?.nodes?.size || 0, diagnostics: ir.diagnostics.map(function(d: any) { return { code: d.code, severity: d.severity }; }) }, null, 2);
    });
    break;
  case "explain":
    runCommand(function(src: string, lp: string): string {
      var t = parseText(lp, src);
      var graph = createProvenanceGraph();
      graph.addNode({ id: "src", phase: "source", label: lp, span: t.root.root.span });
      var built = graph.build();
      var result = explainGraph(built, { kind: "source", offset: 0 });
      return JSON.stringify({ nodes: result.matchingNodes.length, edges: result.edges.length }, null, 2);
    });
    break;
  default:
    console.error("gspl: unknown command:", cmd);
    process.exit(2);
}
