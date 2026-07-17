#!/usr/bin/env node
// gspl explain CLI - Prompt 3 §19.
import { parseText } from "@gspl/parser";
import { lowerToAst, createProvenanceGraph, explainGraph, provenanceToJSON } from "@gspl/frontend";

var args = process.argv.slice(2);
var fileArg = args[0] || "-";
var queryArg = args[1] || "source";

function explainSource(src: string) {
  var pr = parseText("pipe.gspl", src);
  var astResult = lowerToAst(pr.root, "gspl-text/1.0", pr.diagnostics);
  var ast = astResult.program;
  var graph = createProvenanceGraph()
    .addNode({ id: "source", phase: "source", label: "pipe.gspl" })
    .addNode({ id: "ast", phase: "ast", label: "Program(" + ast.imports.length + " imports, " + ast.topLevelGenes.length + " genes)" })
    .addEdge("source", "ast", "lowers-to")
    .build();
  console.log(provenanceToJSON(graph));
  console.log("Nodes: " + graph.nodes.length + " Edges: " + graph.edges.length);
}

if (fileArg === "-") {
  var chunks: string[] = [];
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", function(c: string) { chunks.push(c); });
  process.stdin.on("end", function() { explainSource(chunks.join("")); });
} else {
  var fs = require("fs");
  var src = fs.readFileSync(fileArg, "utf8");
  explainSource(src);
}
