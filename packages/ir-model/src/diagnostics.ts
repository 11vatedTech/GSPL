/** Structured diagnostics and provenance — Prompt 2 §11 */

import type { NodeID, EdgeID } from './graph.js';

// ── Diagnostics ──

export type DiagnosticSeverity = 'error' | 'warning' | 'info' | 'hint';

export type DiagnosticCategory =
  | 'SCHEMA'
  | 'TYPE'
  | 'REFERENCE'
  | 'CONSTRAINT'
  | 'INVARIANT'
  | 'CAPABILITY'
  | 'EFFECT'
  | 'DETERMINISM'
  | 'CANONICALIZATION'
  | 'HASH'
  | 'GRAPH'
  | 'CYCLE'
  | 'RESOURCE'
  | 'VERSION'
  | 'MIGRATION'
  | 'SECURITY'
  | 'PROVENANCE'
  | 'TARGET'
  | 'EXTENSION'
  | 'INTERNAL';

export type DiagnosticCode = string;

export interface Diagnostic {
  code: DiagnosticCode;
  severity: DiagnosticSeverity;
  category: DiagnosticCategory;
  message: string;
  /** Source span in the authoring seed */
  sourceSpan?: DiagnosticSourceSpan;
  /** IR node or edge this diagnostic relates to */
  irNode?: NodeID;
  irEdge?: EdgeID;
  /** Related evidence */
  relatedEvidence?: DiagnosticEvidence[];
  /** Provenance chain */
  provenanceChain?: ProvenanceChain;
  /** Suggested repair */
  suggestedRepair?: string;
  /** Impact on determinism */
  determinismImpact?: 'none' | 'warning' | 'breaking';
  /** Impact on target output */
  targetImpact?: 'none' | 'degraded' | 'blocked';
}

export interface DiagnosticSourceSpan {
  seedPath?: string;
  geneName?: string;
  irNodeId?: string;
  start?: { line: number; column: number };
  end?: { line: number; column: number };
}

export interface DiagnosticEvidence {
  source: string;
  description: string;
  reference?: string;
}

export interface DiagnosticReport {
  schema: 'gspl.diagnostic-report';
  schemaVersion: string;
  /** Operational audit — NOT canonical */
  generatedAt?: string;
  diagnostics: Diagnostic[];
  summary: DiagnosticSummary;
}

export interface DiagnosticSummary {
  total: number;
  errors: number;
  warnings: number;
  info: number;
  hints: number;
  byCategory: Record<string, number>;
}

// ── Provenance ──

export interface ProvenanceChain {
  source: 'seed' | 'knowledge' | 'rule' | 'compiler' | 'default';
  originId: string;
  transformation?: string;
  previousTransformations?: string[];
  /** Link to the original source entry */
  sourceRecord?: ProvenanceSourceRef;
}

export interface ProvenanceSourceRef {
  repositoryId: string;
  relativePath: string;
  lineStart?: number;
  lineEnd?: number;
}

export interface ProvenanceRecord {
  id: string;
  chain: ProvenanceChain;
  /** What node/edge was generated */
  producedEntity: { type: 'node' | 'edge' | 'region'; id: string };
  /** Input entities that produced this */
  consumedEntities: { type: 'node' | 'edge' | 'region'; id: string }[];
  /** Timestamp of generation — operational, NOT canonical */
  generatedAt?: string;
}

/** Build a provenance chain for a given source */
export function provenanceChain(
  source: ProvenanceChain['source'],
  originId: string,
  transformation?: string
): ProvenanceChain {
  return { source, originId, transformation };
}

/** Default provenance when no better source exists */
export function defaultProvenance(): ProvenanceChain {
  return { source: 'default', originId: 'gspl-compiler' };
}

/** Create a diagnostic */
export function diagnostic(
  code: DiagnosticCode,
  severity: DiagnosticSeverity,
  category: DiagnosticCategory,
  message: string,
  overrides?: Partial<Diagnostic>
): Diagnostic {
  return { code, severity, category, message, ...overrides };
}
