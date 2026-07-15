/** Typed attributed GSPL IR graph — Prompt 2 §7 */

import type { ProvenanceChain } from './diagnostics.js';

// ── Core IDs ──

export type NodeID = string;
export type EdgeID = string;
export type RegionID = string;
export type TypeID = string;
export type ValueID = string;
export type ConstraintID = string;
export type RuleID = string;
export type TargetID = string;
export type ProvenanceID = string;
export type SourceID = string;
export type EntropyChannelID = string;
export type ResourceBudgetID = string;
export type CapabilityID = string;
export type EffectID = string;

// ── Node & Edge Kinds ──

export type IrNodeKind =
  | 'value'
  | 'gene'
  | 'constraint'
  | 'invariant'
  | 'capability'
  | 'effect'
  | 'dependency'
  | 'reference'
  | 'region'
  | 'target'
  | 'entropy-channel'
  | 'resource-budget'
  | 'provenance'
  | 'diagnostic'
  | 'extension';

export type IrEdgeKind =
  | 'contains'
  | 'references'
  | 'constrains'
  | 'depends-on'
  | 'produces'
  | 'requires'
  | 'entropy-forks-to'
  | 'lowers-to'
  | 'projects-to'
  | 'conflicts-with'
  | 'extends';

// ── Node ──

export interface GsplIrNode {
  id: NodeID;
  kind: IrNodeKind;
  type: TypeID;
  value: unknown;
  attributes: Record<string, unknown>;
  region?: RegionID;
  /** Source span (optional, for authoring → IR traceability) */
  sourceSpan?: IrSourceSpan;
  provenance: ProvenanceChain;
  /** Deterministic entropy channel if this node consumes entropy */
  entropyChannel?: EntropyChannelID;
  /** Extension data for unknown node types */
  extensions?: Record<string, unknown>;
}

export interface IrSourceSpan {
  seedPath?: string;
  geneName?: string;
  start?: { line: number; column: number };
  end?: { line: number; column: number };
}

// ── Edge ──

export interface GsplIrEdge {
  id: EdgeID;
  kind: IrEdgeKind;
  from: NodeID;
  to: NodeID;
  attributes: Record<string, unknown>;
  provenance: ProvenanceChain;
  extensions?: Record<string, unknown>;
}

// ── Region ──

export interface GsplIrRegion {
  id: RegionID;
  name: string;
  nodes: NodeID[];
  subRegions: RegionID[];
  attributes: Record<string, unknown>;
  provenance: ProvenanceChain;
}

// ── Graph ──

export interface GsplIrGraph {
  schema: 'gspl.ir-graph';
  schemaVersion: string;
  nodes: Map<NodeID, GsplIrNode>;
  edges: Map<EdgeID, GsplIrEdge>;
  regions: Map<RegionID, GsplIrRegion>;
  rootRegion: RegionID;
  metadata: IrGraphMetadata;
}

export interface IrNormalizedGraph extends GsplIrGraph {
  normalizationHash: string;
  /** Operational audit timestamp — NOT part of canonical hash material */
  normalizedAt?: string;
}

export interface IrGraphMetadata {
  seedIdentityHash: string;
  compilerVersion: string;
  canonVersion: string;
  /** Operational audit timestamp — NOT part of canonical hash material */
  generatedAt?: string;
}

// ── Graph Properties (per §7.1) ──

export interface IrGraphProperties {
  directed: boolean;
  multiEdge: boolean;
  cyclicAllowed: boolean;
  regionBased: boolean;
  typed: boolean;
  attributed: boolean;
  versioned: boolean;
  persistent: boolean;
  contentAddressed: boolean;
}

export const DEFAULT_IR_GRAPH_PROPERTIES: IrGraphProperties = {
  directed: true,
  multiEdge: true,
  cyclicAllowed: true,
  regionBased: true,
  typed: true,
  attributed: true,
  versioned: true,
  persistent: true,
  contentAddressed: true,
};
