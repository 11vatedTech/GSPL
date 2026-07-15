/** Graph operations: construction, normalization, hashing — Prompt 2 §7.2-7.3 */
import { createHash } from 'node:crypto';
import { defaultProvenance } from './diagnostics.js';
// ── Construction ──
export function createIrGraph(metadata) {
    const rootId = 'region:root';
    const rootRegion = {
        id: rootId,
        name: 'root',
        nodes: [],
        subRegions: [],
        attributes: {},
        provenance: defaultProvenance(),
    };
    const graph = {
        schema: 'gspl.ir-graph',
        schemaVersion: '1.0',
        nodes: new Map(),
        edges: new Map(),
        regions: new Map([[rootId, rootRegion]]),
        rootRegion: rootId,
        metadata,
    };
    return graph;
}
export function addNode(graph, node, regionId) {
    if (graph.nodes.has(node.id)) {
        throw new Error('Duplicate node: ' + node.id);
    }
    graph.nodes.set(node.id, node);
    const region = regionId ?? graph.rootRegion;
    const r = graph.regions.get(region);
    if (r) {
        r.nodes.push(node.id);
    }
    return graph;
}
export function addEdge(graph, edge) {
    if (graph.edges.has(edge.id)) {
        throw new Error('Duplicate edge: ' + edge.id);
    }
    if (!graph.nodes.has(edge.from) || !graph.nodes.has(edge.to)) {
        throw new Error('Edge references unknown nodes: ' + edge.from + ' -> ' + edge.to);
    }
    graph.edges.set(edge.id, edge);
    return graph;
}
export function addRegion(graph, region, parentRegionId) {
    if (graph.regions.has(region.id)) {
        throw new Error('Duplicate region: ' + region.id);
    }
    graph.regions.set(region.id, region);
    const parent = parentRegionId ?? graph.rootRegion;
    const p = graph.regions.get(parent);
    if (p) {
        p.subRegions.push(region.id);
    }
    return graph;
}
// ── Canonical Normalization (§7.2) ──
/** Deterministic node ordering: sort by ID */
function sortNodesCanonically(nodes) {
    return [...nodes].sort((a, b) => a.id.localeCompare(b.id));
}
/** Deterministic edge ordering: sort by (from, to, kind) */
function sortEdgesCanonically(edges) {
    return [...edges].sort((a, b) => {
        const fa = a.from.localeCompare(b.from);
        if (fa !== 0)
            return fa;
        const ta = a.to.localeCompare(b.to);
        if (ta !== 0)
            return ta;
        return a.kind.localeCompare(b.kind);
    });
}
/** Normalize a graph into deterministic canonical form */
export function normalizeGraph(graph) {
    const sorted = sortGraphCanonically(graph);
    const hashStr = computeGraphHash(sorted);
    return {
        ...sorted,
        normalizationHash: hashStr,
        // normalizedAt is operational — only set for audit, not canonical output
    };
}
/** Sort graph deterministically (shallow copy with sorted maps) */
export function sortGraphCanonically(graph) {
    const nodeEntries = sortNodesCanonically([...graph.nodes.values()]);
    const edgeEntries = sortEdgesCanonically([...graph.edges.values()]);
    const regionEntries = [...graph.regions.values()].sort((a, b) => a.id.localeCompare(b.id));
    const sortedNodes = new Map(nodeEntries.map(n => [n.id, n]));
    const sortedEdges = new Map(edgeEntries.map(e => [e.id, e]));
    const sortedRegions = new Map(regionEntries.map(r => [r.id, r]));
    return { ...graph, nodes: sortedNodes, edges: sortedEdges, regions: sortedRegions };
}
// ── Content Hashing (§7.2) ──
function makeHashable(graph) {
    const parts = [];
    // Hash schema and version
    parts.push(graph.schema);
    parts.push(graph.schemaVersion);
    parts.push(graph.rootRegion);
    parts.push(graph.metadata.seedIdentityHash);
    parts.push(graph.metadata.compilerVersion);
    parts.push(graph.metadata.canonVersion);
    // Hash nodes deterministically
    const sorted = sortGraphCanonically(graph);
    for (const [id, node] of sorted.nodes) {
        parts.push('N:' + id + ':' + node.kind + ':' + node.type);
        // Hash value (only if it's a primitive)
        if (node.value !== undefined && node.value !== null) {
            parts.push('V:' + JSON.stringify(node.value));
        }
        // Hash attributes
        const attrKeys = Object.keys(node.attributes).sort();
        for (const k of attrKeys) {
            parts.push('A:' + k + '=' + JSON.stringify(node.attributes[k]));
        }
    }
    // Hash edges deterministically
    for (const [id, edge] of sorted.edges) {
        parts.push('E:' + edge.from + '->' + edge.to + ':' + edge.kind);
    }
    // Hash regions
    const regionKeys = [...sorted.regions.keys()].sort();
    for (const rk of regionKeys) {
        const r = sorted.regions.get(rk);
        parts.push('R:' + r.id + ':' + r.name);
        parts.push('RN:' + [...r.nodes].sort().join(','));
        parts.push('RS:' + [...r.subRegions].sort().join(','));
    }
    return parts.join('\n');
}
/** Compute SHA-256 content hash of a graph */
export function computeGraphHash(graph) {
    const hashable = makeHashable(graph);
    return 'sha256:' + createHash('sha256').update(hashable).digest('hex');
}
// ── Validation ──
/** Validate basic graph structure integrity */
export function validateGraphStructure(graph) {
    const errors = [];
    // All edge endpoints must exist
    for (const [id, edge] of graph.edges) {
        if (!graph.nodes.has(edge.from)) {
            errors.push('Edge ' + id + ' references unknown from-node: ' + edge.from);
        }
        if (!graph.nodes.has(edge.to)) {
            errors.push('Edge ' + id + ' references unknown to-node: ' + edge.to);
        }
    }
    // Root region must exist
    if (!graph.regions.has(graph.rootRegion)) {
        errors.push('Root region does not exist: ' + graph.rootRegion);
    }
    // Region nodes must exist
    for (const [rid, region] of graph.regions) {
        for (const nid of region.nodes) {
            if (!graph.nodes.has(nid)) {
                errors.push('Region ' + rid + ' references unknown node: ' + nid);
            }
        }
        for (const srid of region.subRegions) {
            if (!graph.regions.has(srid)) {
                errors.push('Region ' + rid + ' references unknown sub-region: ' + srid);
            }
        }
    }
    // Check for orphan nodes (not in any region)
    const nodesInRegions = new Set();
    for (const [, r] of graph.regions) {
        for (const nid of r.nodes)
            nodesInRegions.add(nid);
    }
    for (const [nid] of graph.nodes) {
        if (!nodesInRegions.has(nid)) {
            errors.push('Orphan node (not in any region): ' + nid);
        }
    }
    return { ok: errors.length === 0, errors };
}
//# sourceMappingURL=graph-ops.js.map