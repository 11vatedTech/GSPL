/** Target-neutral artifact graph — Prompt 2 §4.5 */
export type ArtifactKind = 'source-file' | 'module' | 'package' | 'asset' | 'media-stream' | 'scene' | 'configuration' | 'test' | 'documentation' | 'metadata' | 'binary-blob' | 'interactive-artifact' | 'test-fixture';
export interface TargetArtifactGraph {
    schema: 'gspl.artifact-graph';
    schemaVersion: string;
    seedIdentity: string;
    artifacts: ArtifactNode[];
    relationships: ArtifactEdge[];
    metadata: ArtifactMetadata;
    /** Operational audit timestamp — NOT part of canonical output */
    generatedAt?: string;
}
export interface ArtifactNode {
    id: string;
    kind: ArtifactKind;
    name: string;
    path: string;
    content?: string | Uint8Array;
    language?: string;
    encoding?: string;
    attributes: Record<string, unknown>;
    targetCapabilities: string[];
    sourceNodeIds: string[];
}
export interface ArtifactEdge {
    id: string;
    from: string;
    to: string;
    relationship: 'imports' | 'references' | 'contains' | 'depends-on' | 'generates' | 'tests' | 'configures' | 'documents';
    attributes: Record<string, unknown>;
}
export interface ArtifactMetadata {
    totalArtifacts: number;
    totalSizeBytes: number;
    targetContractIds: string[];
}
export interface TargetEmitter {
    targetKind: string;
    emit(artifact: ArtifactNode): Promise<{
        path: string;
        bytes: Uint8Array;
    }>;
}
export declare function createArtifactGraph(seedIdentity: string): TargetArtifactGraph;
export declare function addArtifact(graph: TargetArtifactGraph, artifact: ArtifactNode): TargetArtifactGraph;
export declare function emitArtifacts(graph: TargetArtifactGraph, emitters: Map<string, TargetEmitter>): Promise<Map<string, Uint8Array>>;
//# sourceMappingURL=artifact-graph.d.ts.map