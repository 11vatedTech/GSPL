/** Target-neutral artifact graph — Prompt 2 §4.5 */

export type ArtifactKind =
  | 'source-file'
  | 'module'
  | 'package'
  | 'asset'
  | 'media-stream'
  | 'scene'
  | 'configuration'
  | 'test'
  | 'documentation'
  | 'metadata'
  | 'binary-blob'
  | 'interactive-artifact'
  | 'test-fixture';

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
  emit(artifact: ArtifactNode): Promise<{ path: string; bytes: Uint8Array }>;
}

export function createArtifactGraph(seedIdentity: string): TargetArtifactGraph {
  return {
    schema: 'gspl.artifact-graph',
    schemaVersion: '1.0',
    seedIdentity,
    artifacts: [],
    relationships: [],
    metadata: { totalArtifacts: 0, totalSizeBytes: 0, targetContractIds: [] },
  };
}

export function addArtifact(graph: TargetArtifactGraph, artifact: ArtifactNode): TargetArtifactGraph {
  if (graph.artifacts.some(a => a.id === artifact.id)) {
    throw new Error('Duplicate artifact: ' + artifact.id);
  }
  graph.artifacts.push(artifact);
  graph.metadata.totalArtifacts = graph.artifacts.length;
  return graph;
}

export function emitArtifacts(
  graph: TargetArtifactGraph,
  emitters: Map<string, TargetEmitter>
): Promise<Map<string, Uint8Array>> {
  const results = new Map<string, Uint8Array>();
  const promises = graph.artifacts.map(async (artifact) => {
    const emitter = emitters.get(artifact.kind);
    if (!emitter) {
      throw new Error('No emitter for artifact kind: ' + artifact.kind);
    }
    const { path, bytes } = await emitter.emit(artifact);
    results.set(path, bytes);
  });
  return Promise.all(promises).then(() => results);
}
