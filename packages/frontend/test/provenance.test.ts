/** Provenance graph tests - Prompt 3 §19. */
import { describe, it, expect } from "vitest";
import { createProvenanceGraph, explainGraph, provenanceToJSON } from "../src/provenance.js";

describe("§19 Provenance graph", function() {
  it("creates empty graph", function() {
    var g = createProvenanceGraph().build();
    expect(g.nodes.length).toBe(0);
    expect(g.edges.length).toBe(0);
  });
  it("adds nodes and edges", function() {
    var g = createProvenanceGraph()
      .addNode({ id: "n1", phase: "source", label: "source.gspl" })
      .addNode({ id: "n2", phase: "ast", label: "GeneDecl:health" })
      .addEdge("n1", "n2", "source-to-ast")
      .build();
    expect(g.nodes.length).toBe(2);
    expect(g.edges.length).toBe(1);
  });
  it("adds desugaring traces", function() {
    var g = createProvenanceGraph()
      .addNode({ id: "n1", phase: "ast", label: "sugar" })
      .addDesugaring({ original: "a + 1", desugared: "a.plus(1)", location: { sourceId: "src" as any, start: 0, end: 5 }, rule: "operator-to-method" })
      .build();
    expect(g.desugarings.length).toBe(1);
  });
  it("explains by offset", function() {
    var g = createProvenanceGraph()
      .addNode({ id: "n1", phase: "ast", label: "expr", span: { sourceId: "src" as any, start: 10, end: 20 } })
      .build();
    var result = explainGraph(g, { kind: "source", offset: 15 });
    expect(result.matchingNodes.length).toBe(1);
  });
  it("explains by id with related nodes", function() {
    var g = createProvenanceGraph()
      .addNode({ id: "node-a", phase: "cst", label: "GeneDeclaration" })
      .addNode({ id: "node-b", phase: "ast", label: "GeneDecl" })
      .addEdge("node-a", "node-b", "cst-to-ast")
      .build();
    var result = explainGraph(g, { kind: "cst", id: "node-a" });
    expect(result.matchingNodes.length).toBe(1);
    expect(result.relatedNodes.length).toBe(1);
    expect(result.edges.length).toBe(1);
  });
  it("serializes to deterministic JSON", function() {
    var g = createProvenanceGraph()
      .addNode({ id: "n1", phase: "source", label: "test.gspl" })
      .build();
    var j1 = provenanceToJSON(g);
    var j2 = provenanceToJSON(g);
    expect(j1).toBe(j2);
    var parsed = JSON.parse(j1);
    expect(parsed.nodes.length).toBe(1);
  });
});
