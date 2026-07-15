/** IR to Seed Reconstruction — independent, no original seed (Section 5 fix). */
import type { CanonicalSeed } from "@gspl/seed-format";
import { makePrimordialSeed, canonicalizeSeed } from "@gspl/seed-format";
import type { GsplIrGraph, GsplIrNode } from "@gspl/ir-model";
import type { GeneTypeRegistry } from "@gspl/gene-protocol";

export interface ReconstructionContext {
  readonly geneRegistry: GeneTypeRegistry;
  readonly compilerVersion: string;
  readonly canonVersion: string;
  readonly schemaRegistry?: Record<string, string>;
  readonly limits: { readonly maxGenes: number; readonly maxConstraints: number; readonly maxDependencies: number; };
}

export interface IrReconstructionResult {
  ok: boolean;
  seed: CanonicalSeed;
  errors: string[];
  warnings: string[];
}

export interface IndependentVerificationResult {
  ok: boolean;
  bytesMatch: boolean;
  originalBytes: Uint8Array;
  reconstructedBytes: Uint8Array;
  errors: string[];
  fieldErrors: string[];
}

interface IrReconstructableNode {
  id: string;
  kind: GsplIrNode["kind"];
  type: string;
  value: unknown;
  attributes?: { section?: string; geneName?: string; confidence?: number; [k: string]: unknown };
  provenance?: { source: string; originId: string };
}

function findMetaNode(
  nodes: ReadonlyMap<string, IrReconstructableNode>,
  section: string,
): IrReconstructableNode | undefined {
  const vals: IrReconstructableNode[] = Array.from(nodes.values());
  for (let i = 0; i < vals.length; i++) {
    const n = vals[i];
    if (n.attributes && n.attributes.section === section) return n;
  }
  return undefined;
}

function extractGeneName(nodeId: string, attrs?: IrReconstructableNode["attributes"]): string {
  const p = nodeId.split(":");
  return p.length >= 3 && p[0] === "n" ? p[2]! : (attrs && attrs.geneName) || "unknown";
}

export function reconstructSeedFromIr(graph: GsplIrGraph, ctx: ReconstructionContext): IrReconstructionResult {
  const errors: string[] = [];
  const reg: GeneTypeRegistry = ctx.geneRegistry;
  const ref = graph.nodes as ReadonlyMap<string, IrReconstructableNode>;
  const seedSchema: string = ((findMetaNode(ref, "schema")?.value as { schema?: string } | undefined)?.schema) ?? "gspl.canonical-seed";
  const seedSchemaVersion: string = ((findMetaNode(ref, "schema")?.value as { schemaVersion?: string } | undefined)?.schemaVersion) ?? "1.0";

  const identityNode = findMetaNode(ref, "identity");
  const identityOverrides: Partial<CanonicalSeed["identity"]> = {};
  if (identityNode?.value) {
    const idv = identityNode.value as Partial<CanonicalSeed["identity"]>;
    if (idv.authoredId !== undefined) identityOverrides.authoredId = idv.authoredId;
    if (idv.revisionId !== undefined) identityOverrides.revisionId = idv.revisionId;
    if (idv.lineageId !== undefined) identityOverrides.lineageId = idv.lineageId;
    if (idv.packageId !== undefined) identityOverrides.packageId = idv.packageId;
  }

  const nsNode = findMetaNode(ref, "namespace");
  const namespace = nsNode?.value as CanonicalSeed["namespace"] | undefined;
  const dpNode = findMetaNode(ref, "domainProfile");
  const domainProfile: CanonicalSeed["domainProfile"] = (dpNode?.value as CanonicalSeed["domainProfile"] | undefined) ?? {
    domainId: "seed", requiredCapabilities: [], optionalCapabilities: [],
  };
  const intentNode = findMetaNode(ref, "intent");
  // §5 default-alignment: reconstructor fallbacks MUST EXACTLY match
  // `makePrimordialSeed` defaults in seed-ops.ts. A mismatch (e.g. "Reconstructed from IR"
  // vs "Primordial seed created by GSPL compiler") silently breaks canonical byte equality
  // for any seed whose original lacked an explicit `intent.purpose`.
  const INTENT_PRIMORDIAL_DEFAULT: CanonicalSeed["intent"] = { purpose: "Primordial seed created by GSPL compiler" };
  const intent: CanonicalSeed["intent"] = (intentNode?.value as CanonicalSeed["intent"] | undefined) ?? INTENT_PRIMORDIAL_DEFAULT;

  const geneGroups = new Map<string, { fragments: IrReconstructableNode[]; confidence?: number }>();
  ref.forEach((node) => {
    const gn = extractGeneName(node.id, node.attributes);
    if (gn === "unknown" || gn === "seed-root" || (node.attributes && node.attributes.section)) return;
    const existing = geneGroups.get(gn);
    if (existing) existing.fragments.push(node);
    else geneGroups.set(gn, { fragments: [node], confidence: node.attributes?.confidence });
  });

  const genes: Record<string, { type: string; value: unknown; confidence?: number }> = {};
  geneGroups.forEach((group, geneName) => {
    const geneNode = group.fragments.find((f) => f.kind === "gene" || (!!f.type && reg.has(f.type)));
    const typeId: string = (geneNode?.type) ?? (group.fragments[0]?.type) ?? "unknown";
    const desc = reg.get(typeId);
    if (desc && desc.liftFromIr) {
      try {
        const lifted = desc.liftFromIr(group.fragments as unknown as Parameters<NonNullable<typeof desc.liftFromIr>>[0], {
          seedId: "reconstructed", geneName,
          resolveGeneValue: (_tid: string, _ids: string[]) => null,
        });
        genes[geneName] = { type: typeId, value: lifted, confidence: group.confidence };
      } catch (e) {
        errors.push("Lift error " + geneName + ": " + String(e));
        genes[geneName] = { type: typeId, value: geneNode?.value ?? null, confidence: group.confidence };
      }
    } else {
      genes[geneName] = { type: typeId, value: geneNode?.value ?? null, confidence: group.confidence };
    }
  });

  const readMeta = (s: string): unknown => findMetaNode(ref, s)?.value;
  const constraints = (readMeta("constraints") as CanonicalSeed["constraints"] | undefined) ?? {
    valueRanges: [], structuralConditions: [], targetRestrictions: [], performanceBudgets: [], compatibilityConditions: [],
  };
  const dependencies = (readMeta("dependencies") as CanonicalSeed["dependencies"] | undefined) ?? {
    contextRefs: [], knowledgeRefs: [], ruleSetRefs: [], targetContracts: [],
  };
  const entropy = (readMeta("entropy") as CanonicalSeed["entropy"] | undefined) ?? {
    algorithm: "gspl-splitmix64", algorithmVersion: "1.0", rootSeed: "", channels: [],
  };
  const lineage = (readMeta("lineage") as CanonicalSeed["lineage"] | undefined) ?? {
    operation: "primordial", parents: [], generation: 0,
  };
  const provenance = (readMeta("provenance") as CanonicalSeed["provenance"] | undefined) ?? { canonVersion: "1.0" };
  const resourceBudget = (readMeta("resourceBudget") as CanonicalSeed["resourceBudget"] | undefined) ?? {};
  const effectPermissions = (readMeta("effectPermissions") as CanonicalSeed["effectPermissions"] | undefined) ?? {
    filesystem: "none", processExecution: false, networkAccess: false, environmentAccess: false,
    timeAccess: false, foreignCodeExecution: false, nativeExtensions: false, modelInference: false,
  } as CanonicalSeed["effectPermissions"];
  const validationReqs = readMeta("validationRequirements") as CanonicalSeed["validationRequirements"] | undefined;
  const compatReqs = readMeta("compatibilityRequirements") as CanonicalSeed["compatibilityRequirements"] | undefined;

  const seed = makePrimordialSeed({
    schema: seedSchema, schemaVersion: seedSchemaVersion,
    namespace, domainProfile, intent,
    payload: { schemaVersion: "1.0", genes },
    constraints, dependencies, entropy, lineage, provenance, resourceBudget, effectPermissions,
    validationRequirements: validationReqs, compatibilityRequirements: compatReqs,
  });
  // §5: identity overrides MUST be merged into `seed.identity`, NOT spread at the
  // top level of the overrides argument to makePrimordialSeed. `makePrimordialSeed`
  // accepts `Partial<CanonicalSeed>` and reads identity from `overrides.identity`,
  // so a top-level `authoredId` / `revisionId` / etc. is silently dropped. The
  // post-construction Object.assign below is the canonical merge path.
  Object.assign(seed.identity, identityOverrides);

  return { ok: errors.length === 0, seed, errors, warnings: [] };
}

/**
 * §5 Independent IR reconstruction verification — STRICT: this function MUST NOT
 * close over, copy, or reference any original seed. `originalBytes` is the entire
 * expected canonical output (computed from the source canonical seed BEFORE this
 * function is invoked). Comparison is done on `originalBytes` only.
 *
 * Historical bug fix: the prior implementation dereferenced an undefined
 * `originalSeed` identifier inside the diagnostic branch, which (a) was a no-op
 * in practice because the identifier was undefined but (b) signaled that the
 * reconstructor was still assuming access to a closing scope variable. This
 * implementation removes that reference entirely.
 */
export function verifyIndependentReconstruction(
  originalBytes: Uint8Array,
  graph: GsplIrGraph,
  ctx: ReconstructionContext,
): IndependentVerificationResult {
  const result = reconstructSeedFromIr(graph, ctx);
  const rb = canonicalizeSeed(result.seed);
  const ob = originalBytes;
  let match = ob.length === rb.length;
  if (match) {
    for (let i = 0; i < ob.length; i++) {
      if (ob[i] !== rb[i]) { match = false; break; }
    }
  }
  const fe: string[] = [];
  if (!match) fe.push("Bytes diff: " + ob.length + " vs " + rb.length);
  return {
    ok: match && result.ok,
    bytesMatch: match,
    originalBytes: ob,
    reconstructedBytes: rb,
    errors: result.errors.concat(fe),
    fieldErrors: fe,
  };
}