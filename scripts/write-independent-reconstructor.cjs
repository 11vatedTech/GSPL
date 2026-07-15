var fs = require('fs');

// ── 1. New independent ir-reconstructor ──
var reconContent = `/** IR to Seed Reconstruction — Prompt 2 §1-3 (independent, no original seed) */
import type { CanonicalSeed, SeedDomainProfile, DeclaredIntent, SeedConstraints, SeedDependencies, DeterministicEntropyDeclaration, SeedLineage, SeedProvenance, ResourceBudget, EffectPermissions as EffectPerms, SeedNamespace, TargetContract, SeedIdentity } from "@gspl/seed-format";
import { makePrimordialSeed, canonicalizeSeed } from "@gspl/seed-format";
import type { GsplIrGraph, GsplIrNode, Diagnostic } from "@gspl/ir-model";
import type { GeneTypeRegistry } from "@gspl/gene-protocol";
import { createStandardGeneRegistry } from "@gspl/gene-protocol";

export interface ReconstructionContext {
  schemaRegistry: Record<string, string>;
  geneRegistry: GeneTypeRegistry;
  compilerVersion: string;
  canonVersion: string;
  limits: { maxGenes: number; maxConstraints: number; maxDependencies: number };
}

export interface IrReconstructionResult { ok: boolean; seed: CanonicalSeed; errors: string[]; warnings: string[]; diagnostics: Diagnostic[]; }

function findMetaNode(nodes: Map<string, GsplIrNode>, section: string): GsplIrNode | undefined {
  for (const n of nodes.values()) {
    if (n.attributes?.section === section && n.kind === 'extension') return n;
  }
  return undefined;
}

function findAllMetaNodes(nodes: Map<string, GsplIrNode>, section: string): GsplIrNode[] {
  var r: GsplIrNode[] = [];
  for (const n of nodes.values()) {
    if (n.attributes?.section === section && n.kind === 'extension') r.push(n);
  }
  return r;
}

function extractGeneName(nodeId: string, attrs?: Record<string,unknown>): string {
  var p = nodeId.split(":");
  return p.length >= 3 && p[0] === "n" ? p[2] : (attrs?.geneName as string) ?? "unknown";
}

/** Reconstruct CanonicalSeed from IR alone — no original seed accepted */
export function reconstructSeedFromIr(graph: GsplIrGraph, ctx: ReconstructionContext): IrReconstructionResult {
  var errors: string[] = [];
  var warnings: string[] = [];
  var diags: Diagnostic[] = [];
  var reg = ctx.geneRegistry;

  // ── Reconstruct schema identity ──
  var seedSchema = "gspl.canonical-seed";
  var seedSchemaVersion = "1.0";
  var schemaNode = findMetaNode(graph.nodes, "schema");
  if (schemaNode?.value) {
    var sv = schemaNode.value as Record<string,unknown>;
    if (typeof sv.schema === "string") seedSchema = sv.schema;
    if (typeof sv.schemaVersion === "string") seedSchemaVersion = sv.schemaVersion;
  }

  // ── Reconstruct namespace ──
  var namespace: SeedNamespace | undefined;
  var nsNode = findMetaNode(graph.nodes, "namespace");
  if (nsNode?.value) {
    var nsv = nsNode.value as Record<string,unknown>;
    if (typeof nsv.domain === "string") {
      namespace = { domain: nsv.domain, name: typeof nsv.name === "string" ? nsv.name : "reconstructed", title: typeof nsv.title === "string" ? nsv.title : undefined };
    }
  }

  // ── Reconstruct domain profile ──
  var domainProfile: any = { domainId: "seed", requiredCapabilities: [], optionalCapabilities: [] };
  var dpNode = findMetaNode(graph.nodes, "domainProfile");
  if (dpNode?.value) {
    var dpv = dpNode.value as Record<string,unknown>;
    if (typeof dpv.domainId === "string") domainProfile.domainId = dpv.domainId;
    if (Array.isArray(dpv.requiredCapabilities)) domainProfile.requiredCapabilities = dpv.requiredCapabilities;
    if (Array.isArray(dpv.optionalCapabilities)) domainProfile.optionalCapabilities = dpv.optionalCapabilities;
  }

  // ── Reconstruct intent ──
  var intent: any = { purpose: "Reconstructed from IR" };
  var intentNode = findMetaNode(graph.nodes, "intent");
  if (intentNode?.value) {
    var iv = intentNode.value as Record<string,unknown>;
    if (typeof iv.purpose === "string") intent.purpose = iv.purpose;
    if (Array.isArray(iv.architecturePatterns)) intent.architecturePatterns = iv.architecturePatterns;
    if (Array.isArray(iv.nonGoals)) intent.nonGoals = iv.nonGoals;
  }

  // ── Reconstruct genes (two-pass: collect then lift) ──
  var geneGroups = new Map<string, { fragments: any[]; type: string; confidence?: number }>();
  graph.nodes.forEach(function(node) {
    var gn = extractGeneName(node.id, node.attributes);
    if (gn === "unknown" || gn === "seed-root" || node.attributes?.section) return;
    var frag = { id: node.id, kind: node.kind, type: node.type, value: node.value, attributes: node.attributes, provenance: { source: node.provenance.source, originId: node.provenance.originId } };
    var existing = geneGroups.get(gn);
    if (existing) {
      existing.fragments.push(frag);
    } else {
      geneGroups.set(gn, { fragments: [frag], type: node.type, confidence: node.attributes?.confidence as number | undefined });
    }
  });

  var genes: Record<string,{type:string;value:unknown;confidence?:number}> = {};
  geneGroups.forEach(function(group, geneName) {
    var geneNode = group.fragments.find(function(f: any) { return f.kind === "gene" || f.type && reg.has(f.type); });
    var typeId = geneNode?.type ?? group.type ?? "unknown";
    var desc = reg.get(typeId);
    if (desc?.liftFromIr) {
      try {
        var lifted = desc.liftFromIr(group.fragments, {
          seedId: "reconstructed",
          geneName: geneName,
          resolveGeneValue: function(resolveTypeId: string, resolveNodeIds: string[]) {
            var resolvedGene = geneGroups.get(resolveTypeId);
            if (resolvedGene) {
              var rDesc = reg.get(resolvedGene.type);
              if (rDesc?.liftFromIr) return rDesc.liftFromIr(resolvedGene.fragments, { seedId: "reconstructed", geneName: resolveTypeId, resolveGeneValue: function() { return null; } });
            }
            return null;
          }
        });
        genes[geneName] = { type: typeId, value: lifted, confidence: group.confidence };
      } catch(e) {
        errors.push("Lift error " + geneName + ": " + String(e));
        genes[geneName] = { type: typeId, value: geneNode?.value ?? null };
      }
    } else {
      genes[geneName] = { type: typeId, value: geneNode?.value ?? null, confidence: group.confidence };
    }
  });

  // ── Reconstruct constraints ──
  var constraints: any = { valueRanges: [], structuralConditions: [], targetRestrictions: [], performanceBudgets: [], compatibilityConditions: [] };
  var constraintNode = findMetaNode(graph.nodes, "constraints");
  if (constraintNode?.value) {
    var cv = constraintNode.value as Record<string,unknown>;
    if (cv.valueRanges) constraints.valueRanges = cv.valueRanges;
    if (cv.structuralConditions) constraints.structuralConditions = cv.structuralConditions;
    if (cv.targetRestrictions) constraints.targetRestrictions = cv.targetRestrictions;
    if (cv.performanceBudgets) constraints.performanceBudgets = cv.performanceBudgets;
    if (cv.compatibilityConditions) constraints.compatibilityConditions = cv.compatibilityConditions;
  }

  // ── Reconstruct dependencies ──
  var dependencies: any = { contextRefs: [], knowledgeRefs: [], ruleSetRefs: [], targetContracts: [] };
  var depNode = findMetaNode(graph.nodes, "dependencies");
  if (depNode?.value) {
    var dv = depNode.value as Record<string,unknown>;
    if (dv.contextRefs) dependencies.contextRefs = dv.contextRefs;
    if (dv.knowledgeRefs) dependencies.knowledgeRefs = dv.knowledgeRefs;
    if (dv.ruleSetRefs) dependencies.ruleSetRefs = dv.ruleSetRefs;
    if (dv.targetContracts) dependencies.targetContracts = dv.targetContracts;
  }

  // ── Reconstruct entropy ──
  var entropy: any = { algorithm: "gspl-splitmix64", algorithmVersion: "1.0", rootSeed: "", channels: [] };
  var entropyNode = findMetaNode(graph.nodes, "entropy");
  if (entropyNode?.value) {
    var ev = entropyNode.value as Record<string,unknown>;
    if (typeof ev.algorithm === "string") entropy.algorithm = ev.algorithm;
    if (typeof ev.algorithmVersion === "string") entropy.algorithmVersion = ev.algorithmVersion;
  
