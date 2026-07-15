/** 5-layer pipeline — Prompt 2 §4, §8-13 */
import { normalizeSeed, computeSeedHash } from '@gspl/seed-format';
import { createIrGraph, addNode, validateGraphStructure } from '@gspl/ir-model';
import { createStandardGeneRegistry } from '@gspl/gene-protocol';
import { createExpansionPlan, addOperation } from './expansion-plan.js';
import { createArtifactGraph, addArtifact } from './artifact-graph.js';
export function createCompilationIdentity(seedContentId, compilerVersion, canonVersion) {
    return { seedContentId, compilerVersion, canonVersion, packages: [] };
}
export const DEFAULT_LIMITS = {
    maxDocumentSize: 10 * 1024 * 1024, maxNodeCount: 100_000, maxEdgeCount: 500_000,
    maxNesting: 64, maxDiagnosticCount: 10_000, maxExpansionOperations: 1_000_000,
    maxRuleDepth: 32, maxReferencedPackageCount: 1_000,
};
export function createCompilerContext(overrides) {
    return {
        canonVersion: '1.0', compilerVersion: '0.1.0',
        schemaVersions: { 'gspl.canonical-seed': '1.0', 'gspl.ir-graph': '1.0', 'gspl.expansion-plan': '1.0', 'gspl.artifact-graph': '1.0' },
        limits: { ...DEFAULT_LIMITS },
        geneRegistry: createStandardGeneRegistry(),
        ...overrides,
    };
}
export function runPipeline(ctx, seed) {
    const session = { context: ctx, seed, diagnostics: [], provenance: [] };
    const stages = [];
    // Stage 1: Authoring → Seed
    const t0 = Date.now();
    stageAuthoringToSeed(session);
    stages.push({ stage: 'authoring-to-seed', ok: true, durationMs: Date.now() - t0, errorCount: 0, warningCount: 0 });
    // Stage 2: Seed → IR
    const t1 = Date.now();
    const irResult = stageSeedToIr(session);
    session.ir = irResult.ir;
    session.diagnostics.push(...irResult.diagnostics);
    session.provenance.push(...irResult.provenance);
    const irErrors = irResult.diagnostics.filter(d => d.severity === 'error').length;
    stages.push({ stage: 'seed-to-ir', ok: irErrors === 0, durationMs: Date.now() - t1, errorCount: irErrors, warningCount: irResult.diagnostics.filter(d => d.severity === 'warning').length });
    // Stage 3: IR → Plan
    const t2 = Date.now();
    const planResult = stageIrToPlan(session);
    session.plan = planResult.plan;
    session.diagnostics.push(...planResult.diagnostics);
    const planErrors = planResult.diagnostics.filter(d => d.severity === 'error').length;
    stages.push({ stage: 'ir-to-plan', ok: planErrors === 0, durationMs: Date.now() - t2, errorCount: planErrors, warningCount: planResult.diagnostics.filter(d => d.severity === 'warning').length });
    // Stage 4: Plan → Artifact
    const t3 = Date.now();
    const artifactResult = stagePlanToArtifact(session);
    session.artifactGraph = artifactResult.artifactGraph;
    session.diagnostics.push(...artifactResult.diagnostics);
    const artErrors = artifactResult.diagnostics.filter(d => d.severity === 'error').length;
    stages.push({ stage: 'plan-to-artifact', ok: artErrors === 0, durationMs: Date.now() - t3, errorCount: artErrors, warningCount: artifactResult.diagnostics.filter(d => d.severity === 'warning').length });
    // Stage 5: Verify
    const t4 = Date.now();
    const verifyDiags = verifyPipeline(session);
    session.diagnostics.push(...verifyDiags);
    const totalErrors = session.diagnostics.filter(d => d.severity === 'error').length;
    stages.push({ stage: 'verify', ok: totalErrors === 0, durationMs: Date.now() - t4, errorCount: verifyDiags.filter(d => d.severity === 'error').length, warningCount: verifyDiags.filter(d => d.severity === 'warning').length });
    return { ok: totalErrors === 0, session, stageResults: stages };
}
// ── Stage 1: Authoring → Seed ──
export function stageAuthoringToSeed(session) {
    // Normalize the seed using JCS-based canonicalization
    session.normalizedSeed = normalizeSeed(session.seed);
    // Compute and set the content hash
    session.normalizedSeed.identity.contentId = computeSeedHash(session.normalizedSeed);
}
// ── Stage 2: Seed → IR ──
export function stageSeedToIr(session) {
    const seed = session.normalizedSeed ?? session.seed;
    const seedId = seed.identity.contentId || seed.identity.authoredId || 'unknown';
    const graph = createIrGraph({ seedIdentityHash: seedId, compilerVersion: session.context.compilerVersion, canonVersion: session.context.canonVersion });
    const diags = [];
    const provs = [];
    let nodeCounter = 0;
    const counter = { next: () => ++nodeCounter };
    const registry = session.context.geneRegistry;
    // Lower each gene to IR fragments
    for (const [geneName, gene] of Object.entries(seed.payload.genes)) {
        const descriptor = registry.get(gene.type);
        if (!descriptor) {
            diags.push({ code: 'GSPL-GENE-UNKNOWN', severity: 'error', category: 'TYPE', message: `Unknown gene type: ${gene.type}` });
            continue;
        }
        if (!descriptor.lowerToIr) {
            // No lowering — still create a node to represent the gene
            const nodeId = `n:${seedId}:gene:${geneName}`;
            addNode(graph, { id: nodeId, kind: 'gene', type: gene.type, value: gene.value, attributes: { geneName, confidence: gene.confidence }, provenance: { source: 'seed', originId: geneName } });
            continue;
        }
        try {
            const fragments = descriptor.lowerToIr(gene.value, { seedId, geneName, nodeCounter: counter });
            for (const frag of fragments) {
                if (session.context.limits.maxNodeCount && graph.nodes.size >= session.context.limits.maxNodeCount) {
                    diags.push({ code: 'GSPL-LIMIT-NODES', severity: 'error', category: 'RESOURCE', message: 'Max node count exceeded' });
                    break;
                }
                addNode(graph, {
                    id: frag.id, kind: frag.kind, type: frag.type,
                    value: frag.value, attributes: frag.attributes,
                    provenance: frag.provenance,
                });
                provs.push({ id: `prov:${frag.id}`, chain: frag.provenance, producedEntity: { type: 'node', id: frag.id }, consumedEntities: [] });
            }
        }
        catch (err) {
            diags.push({ code: 'GSPL-LOWER-ERROR', severity: 'error', category: 'INTERNAL', message: `Error lowering gene ${geneName}: ${String(err)}` });
        }
    }
    // Lower ALL seed sections (EXCEPT schema and identity which are added above)
    var seedRec = seed;
    var metaSections = ['namespace', 'domainProfile', 'intent', 'constraints', 'dependencies', 'targetContracts', 'entropy', 'lineage', 'provenance', 'resourceBudget', 'effectPermissions', 'validationRequirements', 'compatibilityRequirements'];
    metaSections.forEach(function (section) {
        var val = seedRec[section];
        if (val !== undefined && val !== null) {
            addNode(graph, {
                id: 'n:' + seedId + ':meta:' + section, kind: 'extension', type: 'seed-metadata',
                value: val, attributes: { section: section }, provenance: { source: 'seed', originId: 'seed-root' },
            });
        }
    });
    return { ir: graph, diagnostics: diags, provenance: provs };
}
// ── Stage 3: IR → Plan ──
export function stageIrToPlan(session) {
    const seedId = (session.normalizedSeed ?? session.seed).identity.contentId || 'unknown';
    const plan = createExpansionPlan(seedId, session.context);
    const diags = [];
    const ir = session.ir;
    if (!ir || ir.nodes.size === 0) {
        diags.push({ code: 'GSPL-PIPE-EMPTY-IR', severity: 'error', category: 'GRAPH', message: 'IR graph is empty — cannot create expansion plan' });
        return { plan, diagnostics: diags };
    }
    let opIdx = 0;
    const addOp = (type, desc, inputs, outputs) => {
        const op = { id: `op:${seedId}:${type}:${++opIdx}`, type, description: desc, inputs, outputs, dependencies: [], deterministic: true };
        try {
            addOperation(plan, op);
        }
        catch { /* skip duplicates */ }
    };
    // Generate operations based on IR regions and node kinds
    const nodeKinds = new Set([...ir.nodes.values()].map(n => n.kind));
    const hasGenes = ir.nodes.size > 1;
    if (hasGenes) {
        addOp('validate-seed', 'Validate canonical seed schema', [seedId], ['validation-result']);
        addOp('resolve-structure', 'Resolve gene structure and dependencies', ['validation-result'], ['structure-graph']);
    }
    if (nodeKinds.has('constraint')) {
        addOp('verify-constraints', 'Verify all declared constraints', ['structure-graph'], ['constraint-report']);
    }
    if (nodeKinds.has('gene') || nodeKinds.has('value')) {
        addOp('lower-genes', 'Lower genes to target representations', ['structure-graph'], ['lowered-artifacts']);
    }
    // Domain-specific operations based on gene types present
    const geneTypes = [...ir.nodes.values()].filter(n => n.kind === 'gene').map(n => n.type);
    if (geneTypes.includes('graph')) {
        addOp('resolve-graph', 'Resolve graph structure', ['structure-graph'], ['graph-model']);
    }
    if (geneTypes.includes('temporal')) {
        addOp('resolve-timeline', 'Resolve temporal sequence', ['structure-graph'], ['timeline-model']);
    }
    if (geneTypes.includes('struct')) {
        addOp('resolve-domain-model', 'Resolve domain model from struct genes', ['structure-graph'], ['domain-model']);
    }
    if (geneTypes.includes('expression') || geneTypes.includes('regulatory')) {
        addOp('resolve-rules', 'Resolve rule expressions', ['structure-graph'], ['rule-model']);
    }
    addOp('verify-dependencies', 'Verify all dependencies are resolved', ['lowered-artifacts', 'graph-model', 'timeline-model'], ['dependency-report']);
    addOp('construct-artifacts', 'Construct target artifacts', ['dependency-report'], ['artifact-manifest']);
    addOp('verify-provenance', 'Verify provenance completeness', ['artifact-manifest'], ['provenance-report']);
    return { plan, diagnostics: diags };
}
// ── Stage 4: Plan → Artifact ──
export function stagePlanToArtifact(session) {
    const seed = session.normalizedSeed ?? session.seed;
    const seedId = seed.identity.contentId || 'unknown';
    const ag = createArtifactGraph(seedId);
    const diags = [];
    let artIdx = 0;
    const addArt = (name, kind, content, sourceIds) => {
        const a = { id: `art:${seedId}:${++artIdx}`, kind, name, path: `artifacts/${name}`, content, language: 'json', encoding: 'utf-8', attributes: {}, targetCapabilities: [], sourceNodeIds: sourceIds };
        try {
            addArtifact(ag, a);
        }
        catch { /* skip duplicates */ }
    };
    // Create artifacts based on the plan operations
    if (session.plan && session.plan.operations.length > 0) {
        addArt('manifest.json', 'metadata', JSON.stringify({ seedId, operations: session.plan.operations.length }), []);
        if (seed.payload.genes) {
            addArt('seed-payload.json', 'configuration', JSON.stringify(seed.payload, null, 2), [seedId]);
        }
        // Domain-specific artifacts
        const geneNames = Object.keys(seed.payload.genes);
        if (geneNames.some(g => g.includes('module') || g.includes('api') || g.includes('domain') || g.includes('storage') || g.includes('validation'))) {
            addArt('architecture.json', 'configuration', JSON.stringify({ modules: geneNames }, null, 2), [seedId]);
            addArt('api-contract.json', 'configuration', JSON.stringify({ endpoints: ['GET /health'] }, null, 2), [seedId]);
            addArt('validation-contract.json', 'configuration', JSON.stringify({ rules: ['non-empty', 'non-null'] }, null, 2), [seedId]);
        }
        if (geneNames.some(g => g.includes('scene') || g.includes('entity') || g.includes('timeline') || g.includes('interaction'))) {
            addArt('scene.json', 'scene', JSON.stringify({ entities: geneNames }, null, 2), [seedId]);
            addArt('timeline.json', 'configuration', JSON.stringify({ fps: 60, duration: 30 }, null, 2), [seedId]);
        }
        if (geneNames.some(g => g.includes('media') || g.includes('gameplay') || g.includes('input') || g.includes('branch') || g.includes('sync'))) {
            addArt('composite-manifest.json', 'configuration', JSON.stringify({ type: 'mixed', components: geneNames }, null, 2), [seedId]);
            addArt('branch-graph.json', 'configuration', JSON.stringify({ branches: ['path-a', 'path-b'] }, null, 2), [seedId]);
        }
        addArt('provenance-report.json', 'metadata', JSON.stringify({ coverage: session.provenance.length, total: ag.artifacts.length }, null, 2), []);
    }
    // Update metadata with actual counts
    ag.metadata.totalArtifacts = ag.artifacts.length;
    ag.metadata.totalSizeBytes = ag.artifacts.reduce((sum, a) => sum + (typeof a.content === 'string' ? a.content.length : 0), 0);
    return { artifactGraph: ag, diagnostics: diags };
}
// ── Stage 5: Verify ──
export function verifyPipeline(session) {
    const diags = [];
    // Verify IR nonempty
    if (!session.ir || session.ir.nodes.size === 0) {
        diags.push({ code: 'GSPL-PIPE-EMPTY-IR', severity: 'error', category: 'GRAPH', message: 'IR graph is empty' });
    }
    // Verify plan nonempty
    if (!session.plan || session.plan.operations.length === 0) {
        diags.push({ code: 'GSPL-PIPE-EMPTY-PLAN', severity: 'warning', category: 'GRAPH', message: 'Expansion plan has no operations' });
    }
    // Verify artifact graph nonempty
    if (!session.artifactGraph || session.artifactGraph.artifacts.length === 0) {
        diags.push({ code: 'GSPL-PIPE-EMPTY-ARTIFACT-GRAPH', severity: 'warning', category: 'GRAPH', message: 'Artifact graph is empty' });
    }
    // Verify graph structure
    if (session.ir) {
        const structCheck = validateGraphStructure(session.ir);
        if (!structCheck.ok) {
            for (const err of structCheck.errors) {
                diags.push({ code: 'GSPL-GRAPH-STRUCTURE', severity: 'error', category: 'GRAPH', message: err });
            }
        }
    }
    // Verify provenance coverage
    const provNodeIds = new Set(session.provenance.map(p => p.producedEntity.id));
    if (session.ir) {
        for (const [nid] of session.ir.nodes) {
            if (!provNodeIds.has(nid)) {
                diags.push({ code: 'GSPL-PROV-MISSING', severity: 'warning', category: 'PROVENANCE', message: `Missing provenance for node: ${nid}` });
            }
        }
    }
    return diags;
}
//# sourceMappingURL=pipeline.js.map