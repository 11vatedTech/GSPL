/**
 * @gspl/ir-model — GSPL Intermediate Representation
 *
 * Typed attributed graph with deterministic normalization,
 * constraint/capability/effect model, diagnostics, and provenance.
 *
 * Per Prompt 2 §7-8, §11.
 */

export type {
  NodeID,
  EdgeID,
  RegionID,
  TypeID,
  ValueID,
  ConstraintID,
  RuleID,
  TargetID,
  ProvenanceID,
  SourceID,
  EntropyChannelID,
  ResourceBudgetID,
  CapabilityID,
  EffectID,
  GsplIrNode,
  GsplIrEdge,
  GsplIrRegion,
  GsplIrGraph,
  IrGraphProperties,
  IrNormalizedGraph,
  IrNodeKind,
  IrEdgeKind,
} from './graph.js';

export type {
  Constraint,
  Invariant,
  Capability,
  Effect,
  ConstraintKind,
  EffectKind,
  CapabilityDeclaration,
  EffectDeclaration,
} from './constraints.js';

export type {
  Diagnostic,
  DiagnosticCode,
  DiagnosticSeverity,
  DiagnosticCategory,
  DiagnosticReport,
  ProvenanceRecord,
  ProvenanceChain,
} from './diagnostics.js';

export {
  createIrGraph,
  addNode,
  addEdge,
  addRegion,
  normalizeGraph,
  sortGraphCanonically,
  computeGraphHash,
  validateGraphStructure,
} from './graph-ops.js';

export {
  DEFAULT_EFFECT_PERMISSIONS,
  STANDARD_EFFECTS,
} from './constraints.js';
