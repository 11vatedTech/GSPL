import { canonicalizeAny } from '@gspl/canon-foundation';
function ok() { return { ok: true }; }
function id(v) { return v; }
function noEffects() { return { filesystem: 'none', network: 'none', execution: 'forbidden', nondeterministic: false }; }
function est(sz) { return { compute: 'linear', memory: 'linear', inputSize: sz }; }
function nid(seedId, geneName, idx, kind) { return 'n:' + seedId + ':' + geneName + ':' + kind + ':' + idx; }
function lowerOne(value, ctx, type, nodeKind) { const id = nid(ctx.seedId, ctx.geneName, ctx.nodeCounter.next(), nodeKind ?? 'value'); return [{ id, kind: nodeKind ?? 'value', type, value, attributes: {}, provenance: { source: 'seed', originId: ctx.geneName } }]; }
function liftOne(nodes, fallback) { const v = nodes[0]?.value; return v !== undefined && v !== null ? v : fallback; }
// ── CORE Descriptors (12) ──
function mkDesc(typeId, classification, desc, fallback) {
    return {
        typeId, version: '1.0', classification, description: desc, valueSchema: { type: 'any' },
        canonicalize: ((v) => canonicalizeAny(v)),
        validate: () => ok(),
        normalize: ((v) => v),
        lowerToIr: ((value, ctx) => lowerOne(value, ctx, typeId)),
        liftFromIr: ((nodes) => liftOne(nodes, fallback)),
        optionalCapabilities: [], migrations: [], resourceEstimate: est(64),
        effectRequirements: noEffects(), targetCapabilities: [],
        mutationAllowed: true, crossoverAllowed: true,
    };
}
export const SCALAR_DESCRIPTOR = {
    ...mkDesc('scalar', 'FUNDAMENTAL_VALUE_KIND', 'Continuous numeric value', 0),
    valueSchema: { type: 'number' },
    canonicalize: ((v) => canonicalizeAny(v)),
    validate: ((v) => typeof v === 'number' && Number.isFinite(v) ? ok() : { ok: false, errors: [{ code: 'GSPL-GENE-001', message: 'Not a finite number' }] }),
    normalize: ((v) => v),
    composition: { compose: (a, b) => a + b, identity: 0, associative: true },
    merge: { merge: (_b, i) => i, strategy: 'incoming-wins' },
    diff: { diff: (a, b) => ({ changed: a !== b, patches: a !== b ? [{ op: 'replace', path: '', value: b }] : [] }) },
    optionalCapabilities: ['mutation', 'crossover', 'distance', 'interpolation', 'sampling', 'evolution'],
    resourceEstimate: est(8),
};
export const CATEGORICAL_DESCRIPTOR = mkDesc('categorical', 'FUNDAMENTAL_VALUE_KIND', 'Discrete label', '');
export const SYMBOLIC_DESCRIPTOR = mkDesc('symbolic', 'FUNDAMENTAL_VALUE_KIND', 'Symbolic token', '');
export const VECTOR_DESCRIPTOR = mkDesc('vector', 'FUNDAMENTAL_VALUE_KIND', 'Ordered tuple of scalars', []);
export const TEMPORAL_DESCRIPTOR = mkDesc('temporal', 'FUNDAMENTAL_VALUE_KIND', 'Time-domain signal', null);
export const DIMENSIONAL_DESCRIPTOR = mkDesc('dimensional', 'FUNDAMENTAL_VALUE_KIND', 'Coordinate-frame', null);
export const EXPRESSION_DESCRIPTOR = mkDesc('expression', 'OPERATOR_OR_RULE', 'Deterministic expression', '');
export const REGULATORY_DESCRIPTOR = mkDesc('regulatory', 'OPERATOR_OR_RULE', 'Conditional logic', null);
export const TOPOLOGY_DESCRIPTOR = mkDesc('topology', 'GRAPH_STRUCTURE', 'Manifold properties', null);
export const STRUCT_DESCRIPTOR = {
    ...mkDesc('struct', 'COMPOSITE_STRUCTURE', 'Composite named fields', {}),
    lowerToIr: (value, ctx) => {
        const fragments = [];
        if (typeof value !== 'object' || value === null || Array.isArray(value))
            return fragments;
        const sid = nid(ctx.seedId, ctx.geneName, ctx.nodeCounter.next(), 'struct');
        fragments.push({ id: sid, kind: 'gene', type: 'struct', value, attributes: {}, provenance: { source: 'seed', originId: ctx.geneName } });
        for (const [key, val] of Object.entries(value)) {
            fragments.push({ id: nid(ctx.seedId, ctx.geneName + '.' + key, ctx.nodeCounter.next(), 'value'), kind: 'value', type: typeof val, value: val, attributes: { fieldName: key, parentStruct: sid }, provenance: { source: 'seed', originId: ctx.geneName } });
        }
        return fragments;
    },
    liftFromIr: (nodes) => { const r = {}; for (const n of nodes) {
        if (typeof n.attributes?.fieldName === 'string')
            r[n.attributes.fieldName] = n.value;
    } return Object.keys(r).length > 0 ? r : {}; },
};
export const ARRAY_DESCRIPTOR = {
    ...mkDesc('array', 'COMPOSITE_STRUCTURE', 'Homogeneous collection', []),
    lowerToIr: (value, ctx) => {
        const fragments = [];
        if (!Array.isArray(value))
            return fragments;
        fragments.push({ id: nid(ctx.seedId, ctx.geneName, ctx.nodeCounter.next(), 'array'), kind: 'gene', type: 'array', value, attributes: { length: value.length }, provenance: { source: 'seed', originId: ctx.geneName } });
        return fragments;
    },
    liftFromIr: (nodes) => { for (const n of nodes) {
        if (Array.isArray(n.value))
            return n.value;
    } return []; },
};
export const GRAPH_DESCRIPTOR = {
    ...mkDesc('graph', 'GRAPH_STRUCTURE', 'Node/edge graph', {}),
    lowerToIr: (value, ctx) => {
        const fragments = [];
        if (typeof value !== 'object' || value === null)
            return fragments;
        const g = value;
        fragments.push({ id: nid(ctx.seedId, ctx.geneName, ctx.nodeCounter.next(), 'graph'), kind: 'gene', type: 'graph', value, attributes: { nodeCount: g.nodes?.length ?? 0, edgeCount: g.edges?.length ?? 0 }, provenance: { source: 'seed', originId: ctx.geneName } });
        if (g.nodes)
            for (const n of g.nodes)
                fragments.push({ id: nid(ctx.seedId, ctx.geneName + '.' + n, ctx.nodeCounter.next(), 'graph-node'), kind: 'value', type: 'symbolic', value: n, attributes: { graphNodeName: n }, provenance: { source: 'seed', originId: ctx.geneName } });
        if (g.edges)
            for (const [from, kind, to] of g.edges)
                fragments.push({ id: nid(ctx.seedId, ctx.geneName + '.edge', ctx.nodeCounter.next(), 'graph-edge'), kind: 'value', type: 'symbolic', value: { from, kind, to }, attributes: { edgeKind: kind }, provenance: { source: 'seed', originId: ctx.geneName } });
        return fragments;
    },
    liftFromIr: (nodes) => {
        const r = {};
        for (const n of nodes) {
            if (typeof n.value === 'string' && n.attributes?.graphNodeName)
                (r.nodes ??= []).push(n.value);
            if (typeof n.value === 'object' && n.value !== null && n.attributes?.edgeKind) {
                const e = n.value;
                (r.edges ??= []).push([e.from, e.kind, e.to]);
            }
        }
        return r;
    },
};
// ── Library types (4) ──
const libDesc = (typeId) => ({ ...mkDesc(typeId, 'DOMAIN_SPECIFIC_LIBRARY_TYPE', typeId + ' domain type', null), mutationAllowed: false, crossoverAllowed: false });
export const FIELD_DESCRIPTOR = libDesc('field');
export const QUANTUM_DESCRIPTOR = libDesc('quantum');
export const GEMATRIA_DESCRIPTOR = libDesc('gematria');
export const RESONANCE_DESCRIPTOR = libDesc('resonance');
export const SOVEREIGNTY_DESCRIPTOR = { ...libDesc('sovereignty'), classification: 'SECURITY_PRIMITIVE', description: 'Cryptographic identity block', resourceEstimate: est(256) };
// ── Exports ──
export const CORE_GENE_DESCRIPTORS = [SCALAR_DESCRIPTOR, CATEGORICAL_DESCRIPTOR, SYMBOLIC_DESCRIPTOR, VECTOR_DESCRIPTOR, TEMPORAL_DESCRIPTOR, DIMENSIONAL_DESCRIPTOR, EXPRESSION_DESCRIPTOR, REGULATORY_DESCRIPTOR, STRUCT_DESCRIPTOR, ARRAY_DESCRIPTOR, GRAPH_DESCRIPTOR, TOPOLOGY_DESCRIPTOR];
export const ALL_GENE_DESCRIPTORS = [...CORE_GENE_DESCRIPTORS, FIELD_DESCRIPTOR, QUANTUM_DESCRIPTOR, GEMATRIA_DESCRIPTOR, RESONANCE_DESCRIPTOR, SOVEREIGNTY_DESCRIPTOR];
export function createStandardGeneRegistry() {
    const m = new Map();
    for (const d of ALL_GENE_DESCRIPTORS) {
        m.set(d.typeId, Object.freeze(d));
    }
    return Object.freeze({ version: '1.0', types: m, get: (id) => m.get(id), has: (id) => m.has(id), list: () => [...m.values()], listByClassification: (c) => [...m.values()].filter(t => t.classification === c) });
}
//# sourceMappingURL=defaults.js.map