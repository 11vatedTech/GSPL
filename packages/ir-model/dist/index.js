/**
 * @gspl/ir-model — GSPL Intermediate Representation
 *
 * Typed attributed graph with deterministic normalization,
 * constraint/capability/effect model, diagnostics, and provenance.
 *
 * Per Prompt 2 §7-8, §11.
 */
export { createIrGraph, addNode, addEdge, addRegion, normalizeGraph, sortGraphCanonically, computeGraphHash, validateGraphStructure, } from './graph-ops.js';
export { DEFAULT_EFFECT_PERMISSIONS, STANDARD_EFFECTS, } from './constraints.js';
//# sourceMappingURL=index.js.map