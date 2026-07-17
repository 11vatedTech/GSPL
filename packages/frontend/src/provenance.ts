/** Frontend provenance graph - connects source->CST->AST->canonical->IR. Prompt 3 §19. */
import type { SourceSpan } from "@gspl/text-source";
import type { AstNodeId } from "./ast-types.js";

export type ProvenancePhase = "source" | "cst" | "ast" | "authoring" | "canonical" | "ir";

export interface ProvenanceNode {
  readonly id: string;
  readonly phase: ProvenancePhase;
  readonly label: string;
  readonly span?: SourceSpan;
  readonly astNodeId?: AstNodeId;
  readonly metadata?: Record<string, unknown>;
}

export interface ProvenanceEdge {
  readonly from: string;
  readonly to: string;
  readonly relation: string;
}

export interface DesugaringTrace {
  readonly original: string;
  readonly desugared: string;
  readonly location: SourceSpan;
  readonly rule: string;
}

export interface FrontendProvenanceGraph {
  readonly nodes: readonly ProvenanceNode[];
  readonly edges: readonly ProvenanceEdge[];
  readonly desugarings: readonly DesugaringTrace[];
}

export interface ExplainQuery {
  readonly kind: "source" | "cst" | "ast" | "symbol" | "canonical" | "ir";
  readonly id?: string;
  readonly offset?: number;
  readonly name?: string;
}

export interface ExplainResult {
  readonly query: ExplainQuery;
  readonly matchingNodes: readonly ProvenanceNode[];
  readonly relatedNodes: readonly ProvenanceNode[];
  readonly edges: readonly ProvenanceEdge[];
  readonly desugarings: readonly DesugaringTrace[];
}

export function createProvenanceGraph(): ProvenanceGraphBuilder {
  return new ProvenanceGraphBuilder();
}

export class ProvenanceGraphBuilder {
  private _nodes: ProvenanceNode[] = [];
  private _edges: ProvenanceEdge[] = [];
  private _desugarings: DesugaringTrace[] = [];

  addNode(node: ProvenanceNode): this { this._nodes.push(node); return this; }
  addEdge(from: string, to: string, relation: string): this { this._edges.push({ from, to, relation }); return this; }
  addDesugaring(trace: DesugaringTrace): this { this._desugarings.push(trace); return this; }

  build(): FrontendProvenanceGraph {
    return {
      nodes: [...this._nodes],
      edges: [...this._edges],
      desugarings: [...this._desugarings],
    };
  }
}

export function explainGraph(graph: FrontendProvenanceGraph, query: ExplainQuery): ExplainResult {
  var matchingNodes: ProvenanceNode[] = [];
  if (query.kind === "source" && query.offset !== undefined) {
    matchingNodes = graph.nodes.filter(function(n) { return n.span && n.span.start <= query.offset! && n.span.end >= query.offset!; });
  } else if (query.id) {
    matchingNodes = graph.nodes.filter(function(n) { return n.id === query.id; });
  } else if (query.name) {
    matchingNodes = graph.nodes.filter(function(n) { return n.label.indexOf(query.name!) >= 0; });
  }
  var relatedIds = new Set<string>();
  for (var i = 0; i < matchingNodes.length; i++) relatedIds.add(matchingNodes[i].id);
  var relatedEdges = graph.edges.filter(function(e) { return relatedIds.has(e.from) || relatedIds.has(e.to); });
  var relatedNodes = graph.nodes.filter(function(n) {
    if (relatedIds.has(n.id)) return false;
    return relatedEdges.some(function(e) { return e.from === n.id || e.to === n.id; });
  });
  return { query, matchingNodes, relatedNodes, edges: relatedEdges, desugarings: graph.desugarings.filter(function(d) { return matchingNodes.some(function(n) { return n.span && n.span.start <= d.location.start && n.span.end >= d.location.end; }); }) };
}

export function provenanceToJSON(graph: FrontendProvenanceGraph): string {
  return JSON.stringify(graph, null, 2);
}
