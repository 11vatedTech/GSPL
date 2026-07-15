/** 5-layer pipeline — Prompt 2 §4, §8-13 */

import type { CanonicalSeed } from '@gspl/seed-format';
import { normalizeSeed, computeSeedHash, canonicalizeSeed, makePrimordialSeed } from '@gspl/seed-format';
import type { GsplIrGraph, GsplIrNode, GsplIrEdge, IrNormalizedGraph, Diagnostic, ProvenanceRecord, ProvenanceChain } from '@gspl/ir-model';
import { createIrGraph, addNode, addEdge, normalizeGraph, validateGraphStructure } from '@gspl/ir-model';
import { createStandardGeneRegistry } from '@gspl/gene-protocol';
import type { GeneTypeRegistry } from '@gspl/gene-protocol';
import type { ExpansionPlan, ExpansionOperation } from './expansion-plan.js';
import { createExpansionPlan, addOperation } from './expansion-plan.js';
import type { TargetArtifactGraph, ArtifactNode, ArtifactEdge } from './artifact-graph.js';
import { createArtifactGraph, addArtifact } from './artifact-graph.js';

export interface CompilerContext {
  canonVersion: string;
  compilerVersion: string;
  schemaVersions: Record<string, string>;
  limits: ResourceLimits;
  geneRegistry: GeneTypeRegistry;
}

/** Deterministic compilation identity — no wall-clock, no random */
export interface CompilationIdentity {
  seedContentId: string;
  compilerVersion: string;
  canonVersion: string;
  packages: string[];
}

export function createCompilationIdentity(seedContentId: string, compilerVersion: string, canonVersion: string): CompilationIdentity {
  return { seedContentId, compilerVersion, canonVersion, packages: [] };
}

export interface ResourceLimits {
  maxDocumentSize: number;
  maxNodeCount: number;
  maxEdgeCount: number;
  maxNesting: number;
  maxDiagnosticCount: number;
  maxExpansionOperations: number;
  maxRuleDepth: number;
  maxReferencedPackageCount: number;
}

export const DEFAULT_LIMITS: ResourceLimits = {
  maxDocumentSize: 10 * 1024 * 1024, maxNodeCount: 100_000, maxEdgeCount: 500_000,
  maxNesting: 64, maxDiagnosticCount: 10_000, maxExpansionOperations: 1_000_000,
  maxRuleDepth: 32, maxReferencedPackageCount: 1_000,
};

export interface CompilerSession {
  context: CompilerContext;
  seed: CanonicalSeed;
  normalizedSeed?: CanonicalSeed;
  ir?: GsplIrGraph;
  normalizedIr?: IrNormalizedGraph;
  plan?: ExpansionPlan;
  artifactGraph?: TargetArtifactGraph;
  diagnostics: Diagnostic[];
  provenance: ProvenanceRecord[];
}

export type PipelineStage = 'authoring-to-seed' | 'seed-to-ir' | 'ir-to-plan' | 'plan-to-artifact' | 'verify';
export interface PipelineResult { ok: boolean; session: CompilerSession; stageResults: StageResult[]; }
export interface StageResult { stage: PipelineStage; ok: boolean; durationMs: number; errorCount: number; warningCount: number; }
export interface SeedToIrResult { ir: GsplIrGraph; diagnostics: Diagnostic[]; provenance: ProvenanceRecord[]; }
export interface IrToPlanResult { plan: ExpansionPlan; diagnostics: Diagnostic[]; }
export interface PlanToArtifactResult { artifactGraph: TargetArtifactGraph; diagnostics: Diagnostic[]; }

export function createCompilerContext(overrides?: Partial<CompilerContext>): CompilerContext {
  return {
    canonVersion: '1.0', compilerVersion: '0.1.0',
    schemaVersions: { 'gspl.canonical-seed': '1.0', 'gspl.ir-graph': '1.0', 'gspl.expansion-plan': '1.0', 'gspl.artifact-graph': '1.0' },
    limits: { ...DEFAULT_LIMITS },
    geneRegistry: createStandardGeneRegistry(),
    ...overrides,
  };
}

export function runPipeline(ctx: CompilerContext, seed: CanonicalSeed): PipelineResult {
  const session: CompilerSession = { context: ctx, seed, diagnostics: [], provenance: [] };
  const stages: StageResult[] = [];

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

export function stageAuthoringToSeed(session: CompilerSession): void {
  // §5 lowering-side canonicalization. Order matters:
  //   1. normalizeSeed parses JCS bytes back to a plain object with all declared
  //      fields. Keys are lexically sorted; undefined values are dropped.
  //   2. makePrimordialSeed is re-applied to populate ALL nested defaults (e.g.
  //      dependencies.targetContracts, intent.architecturePatterns). Without this
  //      step, reconstructSeedFromIr can't round-trip seeds whose original author
  //      relied on default-populated nested fields.
  //   3. contentId is set AFTER re-population so the hash is computed against
  //      the canonical, fully-populated form.
  session.normalizedSeed = normalizeSeed(session.seed);
  session.normalizedSeed = makePrimordialSeed(session.normalizedSeed);
  session.normalizedSeed.identity.contentId = computeSeedHash(session.normalizedSeed);
}

// ── Stage 2: Seed → IR ──

export function stageSeedToIr(session: CompilerSession): SeedToIrResult {
  const seed = session.normalizedSeed ?? session.seed;
  const seedId = seed.identity.contentId || seed.identity.authoredId || 'unknown';
  const graph = createIrGraph({ seedIdentityHash: seedId, compilerVersion: session.context.compilerVersion, canonVersion: session.context.canonVersion });
  const diags: Diagnostic[] = [];
  const provs: ProvenanceRecord[] = [];
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
        // §5/§11: gene confidence is gene-level metadata (not gene-value content).
        // Storing it on each fragment's attributes preserves it across the IR round-trip
        // so the reconstructed seed bytes match the original canonical-form bytes.
        const attrsWithConfidence: Record<string, unknown> = { ...(frag.attributes ?? {}) };
        if (gene.confidence !== undefined) attrsWithConfidence.confidence = gene.confidence;
        addNode(graph, {
          id: frag.id, kind: frag.kind as GsplIrNode['kind'], type: frag.type,
          value: frag.value, attributes: attrsWithConfidence,
          provenance: frag.provenance as ProvenanceChain,
        });
        provs.push({ id: `prov:${frag.id}`, chain: frag.provenance as ProvenanceChain, producedEntity: { type: 'node', id: frag.id }, consumedEntities: [] });
      }
    } catch (err) {
      diags.push({ code: 'GSPL-LOWER-ERROR', severity: 'error', category: 'INTERNAL', message: `Error lowering gene ${geneName}: ${String(err)}` });
    }
  }

  // Lower ALL seed sections (EXCEPT schema and identity which are added above)
  var seedRec = seed as unknown as Record<string, unknown>;
  var metaSections = ['namespace','domainProfile','intent','constraints','dependencies','targetContracts','entropy','lineage','provenance','resourceBudget','effectPermissions','validationRequirements','compatibilityRequirements'];
  metaSections.forEach(function(section) {
    var val = seedRec[section];
    if (val !== undefined && val !== null) {
      addNode(graph, {
        id: 'n:' + seedId + ':meta:' + section, kind: 'extension', type: 'seed-metadata',
        value: val, attributes: { section: section }, provenance: { source: 'seed', originId: 'seed-root' },
      });
    }
  });  return { ir: graph, diagnostics: diags, provenance: provs };
}

// ── Stage 3: IR → Plan ──

export function stageIrToPlan(session: CompilerSession): IrToPlanResult {
  const seedId = (session.normalizedSeed ?? session.seed).identity.contentId || 'unknown';
  const plan = createExpansionPlan(seedId, session.context);
  const diags: Diagnostic[] = [];
  const ir = session.ir;

  if (!ir || ir.nodes.size === 0) {
    diags.push({ code: 'GSPL-PIPE-EMPTY-IR', severity: 'error', category: 'GRAPH', message: 'IR graph is empty — cannot create expansion plan' });
    return { plan, diagnostics: diags };
  }

  let opIdx = 0;
  const addOp = (type: string, desc: string, inputs: string[], outputs: string[]) => {
    const op: ExpansionOperation = { id: `op:${seedId}:${type}:${++opIdx}`, type, description: desc, inputs, outputs, dependencies: [], deterministic: true };
    try { addOperation(plan, op); } catch { /* skip duplicates */ }
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
  if (geneTypes.includes('graph')) { addOp('resolve-graph', 'Resolve graph structure', ['structure-graph'], ['graph-model']); }
  if (geneTypes.includes('temporal')) { addOp('resolve-timeline', 'Resolve temporal sequence', ['structure-graph'], ['timeline-model']); }
  if (geneTypes.includes('struct')) { addOp('resolve-domain-model', 'Resolve domain model from struct genes', ['structure-graph'], ['domain-model']); }
  if (geneTypes.includes('expression') || geneTypes.includes('regulatory')) { addOp('resolve-rules', 'Resolve rule expressions', ['structure-graph'], ['rule-model']); }

  addOp('verify-dependencies', 'Verify all dependencies are resolved', ['lowered-artifacts', 'graph-model', 'timeline-model'], ['dependency-report']);
  addOp('construct-artifacts', 'Construct target artifacts', ['dependency-report'], ['artifact-manifest']);
  addOp('verify-provenance', 'Verify provenance completeness', ['artifact-manifest'], ['provenance-report']);

  return { plan, diagnostics: diags };
}

// ── Stage 4: Plan → Artifact ──

export function stagePlanToArtifact(session: CompilerSession): PlanToArtifactResult {
  const seed = session.normalizedSeed ?? session.seed;
  const seedId = seed.identity.contentId || 'unknown';
  const ag = createArtifactGraph(seedId);
  const diags: Diagnostic[] = [];
  let artIdx = 0;

  const addArt = (name: string, kind: ArtifactNode['kind'], content: string, sourceIds: string[]) => {
    const a: ArtifactNode = { id: `art:${seedId}:${++artIdx}`, kind, name, path: `artifacts/${name}`, content, language: 'json', encoding: 'utf-8', attributes: {}, targetCapabilities: [], sourceNodeIds: sourceIds };
    try { addArtifact(ag, a); } catch { /* skip duplicates */ }
  };

  // Create artifacts based on the plan operations
  if (session.plan && session.plan.operations.length > 0) {
    addArt('manifest.json', 'metadata', JSON.stringify({ seedId, operations: session.plan.operations.length }), [seedId]);

    if (seed.payload.genes) {
      addArt('seed-payload.json', 'configuration', JSON.stringify(seed.payload, null, 2), [seedId]);
    }

    // §13 — Domain-specific artifact CONTENT derived from seed gene values.
    // Each named gene maps deterministically to one specific artifact; the
    // artifact's `content` field is exactly the gene's value as JCS-serialised
    // JSON. No fixture-style hardcoded defaults ("GET /health", "60 FPS",
    // "30 seconds", "path-a", "path-b", "non-empty", "non-null") remain.
    const NAMED_GENE_TO_ARTIFACT: ReadonlyArray<readonly [string, string, ArtifactNode['kind']]> = [
      ['module-structure', 'architecture.json', 'configuration'],
      ['api-contract', 'api-contract.json', 'configuration'],
      ['domain-model', 'domain-model.json', 'configuration'],
      ['storage-abstraction', 'storage-abstraction.json', 'configuration'],
      ['validation-rules', 'validation-contract.json', 'configuration'],
      ['scene-graph', 'scene.json', 'scene'],
      ['entity-specs', 'entity-specs.json', 'configuration'],
      ['timeline', 'timeline.json', 'configuration'],
      ['interactions', 'interactions.json', 'configuration'],
      ['av-references', 'av-references.json', 'configuration'],
      ['media-timeline', 'composite-manifest.json', 'configuration'],
      ['interactive-branches', 'branch-graph.json', 'configuration'],
      ['input-events', 'input-events.json', 'configuration'],
      ['gameplay-state', 'gameplay-state.json', 'configuration'],
      ['av-outputs', 'av-outputs.json', 'configuration'],
      ['sync-constraints', 'sync-constraints.json', 'configuration'],
    ];
    const genes = seed.payload.genes;
    const namedGeneSet = new Set<string>();
    for (const entry of NAMED_GENE_TO_ARTIFACT) {
      const [geneName, artName, kind] = entry;
      const g = genes[geneName];
      if (g !== undefined) {
        addArt(artName, kind, JSON.stringify(g.value, null, 2), [seedId]);
        namedGeneSet.add(geneName);
      }
    }
    // §13 generic-fallback: any gene whose name is NOT in
    // NAMED_GENE_TO_ARTIFACT still surfaces as a `gene-<name>.json` artifact
    // so unspecified gene declarations are honored rather than silently dropped.
    for (const [geneName, geneValue] of Object.entries(genes)) {
      if (namedGeneSet.has(geneName)) continue;
      addArt('gene-' + geneName + '.json', 'configuration', JSON.stringify(geneValue.value, null, 2), [seedId]);
    }

    addArt('provenance-report.json', 'metadata', JSON.stringify({ coverage: session.provenance.length, total: ag.artifacts.length }, null, 2), [seedId]);
  }

  // Update metadata with actual counts
  ag.metadata.totalArtifacts = ag.artifacts.length;
  ag.metadata.totalSizeBytes = ag.artifacts.reduce((sum, a) => sum + (typeof a.content === 'string' ? a.content.length : 0), 0);

  return { artifactGraph: ag, diagnostics: diags };
}

// ── Stage 5: Verify ──

export function verifyPipeline(session: CompilerSession): Diagnostic[] {
  const diags: Diagnostic[] = [];

  // §15: empty IR, empty plan, empty artifact graph, and missing provenance are
  // ERRORs (closure-critical) — no longer warnings. A canonical seed must
  // produce a non-empty IR, a non-empty plan, a non-empty artifact graph, and
  // 100% provenance coverage for canonical entities.
  if (!session.ir || session.ir.nodes.size === 0) {
    diags.push({ code: 'GSPL-PIPE-EMPTY-IR', severity: 'error', category: 'GRAPH', message: 'IR graph is empty' });
  }
  if (!session.plan || session.plan.operations.length === 0) {
    diags.push({ code: 'GSPL-PIPE-EMPTY-PLAN', severity: 'error', category: 'GRAPH', message: 'Expansion plan has no operations' });
  }
  if (!session.artifactGraph || session.artifactGraph.artifacts.length === 0) {
    diags.push({ code: 'GSPL-PIPE-EMPTY-ARTIFACT-GRAPH', severity: 'error', category: 'GRAPH', message: 'Artifact graph is empty' });
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

  // §15: provenance coverage is 100% for canonical entities.
  const provNodeIds = new Set(session.provenance.map(p => p.producedEntity.id));
  if (session.ir) {
    for (const [nid] of session.ir.nodes) {
      if (!provNodeIds.has(nid)) {
        diags.push({ code: 'GSPL-PROV-MISSING', severity: 'error', category: 'PROVENANCE', message: `Missing provenance for node: ${nid}` });
      }
    }
  }

  return diags;
}
