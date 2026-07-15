/** Target-neutral artifact graph — Prompt 2 §4.5 */
export function createArtifactGraph(seedIdentity) {
    return {
        schema: 'gspl.artifact-graph',
        schemaVersion: '1.0',
        seedIdentity,
        artifacts: [],
        relationships: [],
        metadata: { totalArtifacts: 0, totalSizeBytes: 0, targetContractIds: [] },
    };
}
export function addArtifact(graph, artifact) {
    if (graph.artifacts.some(a => a.id === artifact.id)) {
        throw new Error('Duplicate artifact: ' + artifact.id);
    }
    graph.artifacts.push(artifact);
    graph.metadata.totalArtifacts = graph.artifacts.length;
    return graph;
}
export function emitArtifacts(graph, emitters) {
    const results = new Map();
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
//# sourceMappingURL=artifact-graph.js.map