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

export function reconstructSeedFromIr(graph: GsplIrGraph, ctx: ReconstructionContext): IrReconstructionResult {
  const errors: string[] = [];
  const reg: GeneTypeRegistry = ctx.geneRegistry;
  const ref = graph.nodes as ReadonlyMap<string, IrReconstructableNode>;
  // Inferred literal type (no `: string` annotation) to satisfy the strict
  // `gspl.canonical-seed` literal type expected by `makePrimordialSeed.schema`.
  const seedSchema = ((findMetaNode(ref, "schema")?.value as { schema?: string } | undefined)?.schema) ?? "gspl.canonical-seed";
  const seedSchemaVersion = ((findMetaNode(ref, "schema")?.value as { schemaVersion?: string } | undefined)?.schemaVersion) ?? "1.0";

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
  // Whitelist of fragment `kind` values produced by registered descriptors and
  // by the meta-section extension path. Unknown kinds are skipped so a
  // pointer-malformed id cannot slip into geneGroups.
  const KNOWN_KINDS = new Set(["gene", "value", "struct", "array", "graph", "extension"]);
  ref.forEach((node) => {
    if (node.attributes && node.attributes.section) return; // skip meta-extension nodes (have section attribute)
    const parts = node.id.split(":");
    if (parts.length < 5 || parts[0] !== "n") return;
    // Canonical IR id pattern: n:<seedId>:<geneName>:<kind>:<idx>.
    // CRITICAL: seedId itself may contain ':' — e.g. when post-stage 1
    // `computeSeedHash` writes `identity.contentId = 'sha256:<hex>'`, the
    // pipeline encodes that as the seedId prefix. Using fixed-offset
    // parts[2] mis-parses to the SHA-256 hex segment, producing a phantom
    // gene entry like `genes['799054d6...']` (the bug surfaced in the
    // canonicalization.test.ts reset). GeneName sits at parts[len-3],
    // kind at len-2, idx at len-1; we validate both anchors so a colons-in-
    // geneName collision cannot regress this path.
    const idxStr = parts[parts.length - 1];
    if (!/^\d+$/.test(idxStr)) return;
    const kind = parts[parts.length - 2];
    if (!KNOWN_KINDS.has(kind)) return;
    const geneName = parts[parts.length - 3];
    // §5 byte-equal round-trip filter — only TOP-LEVEL gene fragments are
    // reconstructed as standalone genes. Field/child fragments produced by
    // struct/array/graph lowering have geneName containing '.' (e.g.
    // 'module-structure.endpoints') — they belong to their parent's verbatim
    // value and must NOT be promoted to phantom genes with type='unknown'
    // and value=null.
    if (geneName.includes(".")) return;
    // A top-level gene entry is either the gene envelope (kind='gene') or
    // a fundamental-value-kind fragment whose declared type is registered
    // (e.g. 'scalar', 'symbolic', 'expression', 'regulatory'). This
    // matches every Descriptor emitted by core-gene-protocol/src/defaults.ts.
    const isGeneEnvelope = node.kind === "gene";
    const isRegisteredKind = node.type !== undefined && reg.has(node.type);
    if (!isGeneEnvelope && !isRegisteredKind) return;
    const existing = geneGroups.get(geneName);
    if (existing) {
      existing.fragments.push(node);
      if (existing.confidence === undefined && node.attributes && node.attributes.confidence !== undefined) {
        existing.confidence = node.attributes.confidence as number;
      }
    } else {
      geneGroups.set(geneName, {
        fragments: [node],
        confidence: node.attributes?.confidence as number | undefined,
      });
    }
  });

  const genes: Record<string, { type: string; value: unknown; confidence?: number }> = {};
  geneGroups.forEach((group, geneName) => {
    const geneNode = group.fragments.find((f) => f.kind === "gene" || (!!f.type && reg.has(f.type)));
    const typeId: string = (geneNode?.type) ?? (group.fragments[0]?.type) ?? "unknown";
    // §5 byte-equal round-trip: bypass descriptor.liftFromIr entirely. The
    // lowering process (stageSeedToIr / descriptor.lowerToIr) already injects
    // the pristine, unmutated gene.value into the kind='gene' fragment's
    // .value property. liftFromIr reconstructs via Map iteration, which loses
    // array-element order for graph/array genes and silently fills default
    // fields for struct genes — both of which break JCS byte equality since
    // JCS sorts object keys but preserves array order.
    // We therefore trust the verbatim geneNode.value as the canonical
    // reconstruction. descriptor.liftFromIr remains defined but is unused by
    // §5 reconstruction; downstream round-trip-restricted code paths may opt
    // into it when only semantic (hash) equality is required.
    genes[geneName] = {
      type: typeId,
      value: geneNode?.value ?? null,
      confidence: group.confidence,
    };
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

  // §5 byte-equal round-trip — conditional spread for optional fields. Passing
  // `validationRequirements: undefined` would set the key to undefined on the
  // created seed (Object.keys then includes it) and produce a different
  // canonical byte sequence vs. an original seed that simply does not have the
  // key. Spreading only when the IR carries a value matches the original
  // canonical form byte-for-byte.
  const seed = makePrimordialSeed({
    schema: seedSchema as "gspl.canonical-seed", schemaVersion: seedSchemaVersion,
    namespace, domainProfile, intent,
    payload: { schemaVersion: "1.0", genes },
    constraints, dependencies, entropy, lineage, provenance, resourceBudget, effectPermissions,
    ...(validationReqs !== undefined ? { validationRequirements: validationReqs } : {}),
    ...(compatReqs !== undefined ? { compatibilityRequirements: compatReqs } : {}),
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