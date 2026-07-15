/** Graph operations: construction, normalization, hashing — Prompt 2 §7.2-7.3 */
import type { GsplIrGraph, GsplIrNode, GsplIrEdge, GsplIrRegion, RegionID, IrNormalizedGraph, IrGraphMetadata } from './graph.js';
export declare function createIrGraph(metadata: IrGraphMetadata): GsplIrGraph;
export declare function addNode(graph: GsplIrGraph, node: GsplIrNode, regionId?: RegionID): GsplIrGraph;
export declare function addEdge(graph: GsplIrGraph, edge: GsplIrEdge): GsplIrGraph;
export declare function addRegion(graph: GsplIrGraph, region: GsplIrRegion, parentRegionId?: RegionID): GsplIrGraph;
/** Normalize a graph into deterministic canonical form */
export declare function normalizeGraph(graph: GsplIrGraph): IrNormalizedGraph;
/** Sort graph deterministically (shallow copy with sorted maps) */
export declare function sortGraphCanonically(graph: GsplIrGraph): GsplIrGraph;
/** Compute SHA-256 content hash of a graph */
export declare function computeGraphHash(graph: GsplIrGraph): string;
/** Validate basic graph structure integrity */
export declare function validateGraphStructure(graph: GsplIrGraph): {
    ok: boolean;
    errors: string[];
};
//# sourceMappingURL=graph-ops.d.ts.map