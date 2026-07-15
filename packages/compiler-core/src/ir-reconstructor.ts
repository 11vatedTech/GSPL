/** IR to Seed Reconstruction — independent, no original seed (Section 5 fix). */
import type { CanonicalSeed } from "@gspl/seed-format";
import { makePrimordialSeed, canonicalizeSeed } from "@gspl/seed-format";
import type { GsplIrGraph, GsplIrNode } from "@gspl/ir-model";
import type { GeneTypeRegistry } from "@gspl/gene-protocol";

/* ============================================================================
 * Reconstruction modes (Prompt 2 §5)
 * ============================================================================
 *  - CANONICAL_ENVELOPE_RECONSTRUCTION (default): each gene's verbatim value
 *    is carried on a single `kind='gene'` envelope fragment, plus child
 *    field-element fragments emitted by struct/array/graph lowering. The
 *    reconstructor reads the envelope's `.value` directly, so the round-trip
 *    is BYTE-EQUAL: original canonical bytes equal reconstructed bytes.
 *  - STRUCTURED_FRAGMENT_RECONSTRUCTION: gene values are rebuilt from child
 *    fragments via `descriptor.liftFromIr`. Round-trip is SEMANTIC-EQUAL:
 *    canonical hashes match, but bytes may differ (graph `liftFromIr` rebuilds
 *    nodes/edges arrays via Map iteration, so insertion ordering can differ
 *    from the lowering's `Object.entries` order). Use downstream when semantic
 *    fidelity matters more than byte-fidelity.
 * ============================================================================ */
export const RECONSTRUCTION_MODE = {
  CANONICAL_ENVELOPE: "CANONICAL_ENVELOPE_RECONSTRUCTION",
  STRUCTURED_FRAGMENT: "STRUCTURED_FRAGMENT_RECONSTRUCTION",
} as const;
export type ReconstructionMode = typeof RECONSTRUCTION_MODE[keyof typeof RECONSTRUCTION_MODE];

/* ============================================================================
 * Structured diagnostics — Prompt 2 §3
 * ============================================================================
 * Replaces string-only reconstruction errors with typed-coded diagnostics.
 * Each canonical-information absence or mutation is reported with a stable
 * GSPL-RECONSTRUCT-* code, severity, and category so callers can route
 * failures programmatically instead of string-matching.
 * ============================================================================ */
export type ReconstructDiagnosticCode =
  | "GSPL-RECONSTRUCT-MISSING-SECTION"
  | "GSPL-RECONSTRUCT-EMPTY-GENES"
  | "GSPL-RECONSTRUCT-UNKNOWN-KIND"
  | "GSPL-RECONSTRUCT-UNKNOWN-GENE-TYPE"
  | "GSPL-RECONSTRUCT-LIMIT-EXCEEDED"
  | "GSPL-RECONSTRUCT-INCOMPLETE-IDENTITY"
  | "GSPL-RECONSTRUCT-PACKAGE-LOCK-MISMATCH"
  | "GSPL-RECONSTRUCT-HASH-MISMATCH";
export type ReconstructDiagnosticSeverity = "error" | "warning";
export type ReconstructDiagnosticCategory =
  | "GRAPH" | "TYPE" | "IDENTITY" | "LIMITS" | "CONSTRAINT" | "INTERNAL" | "HASH" | "LOCK";
export interface ReconstructDiagnostic {
  readonly code: ReconstructDiagnosticCode;
  readonly severity: ReconstructDiagnosticSeverity;
  readonly category: ReconstructDiagnosticCategory;
  readonly message: string;
  readonly detail?: Readonly<Record<string, unknown>>;
  readonly path?: string;
}
function makeReconstructDiagnostic(
  code: ReconstructDiagnosticCode,
  severity: ReconstructDiagnosticSeverity,
  message: string,
  detail?: Record<string, unknown>,
  path?: string,
): ReconstructDiagnostic {
  const category: ReconstructDiagnosticCategory =
    code === "GSPL-RECONSTRUCT-EMPTY-GENES" || code === "GSPL-RECONSTRUCT-UNKNOWN-KIND" ? "GRAPH" :
    code === "GSPL-RECONSTRUCT-UNKNOWN-GENE-TYPE" ? "TYPE" :
    code === "GSPL-RECONSTRUCT-INCOMPLETE-IDENTITY" ? "IDENTITY" :
    code === "GSPL-RECONSTRUCT-LIMIT-EXCEEDED" ? "LIMITS" :
    code === "GSPL-RECONSTRUCT-MISSING-SECTION" ? "CONSTRAINT" :
    code === "GSPL-RECONSTRUCT-PACKAGE-LOCK-MISMATCH" ? "LOCK" :
    code === "GSPL-RECONSTRUCT-HASH-MISMATCH" ? "HASH" : "INTERNAL";
  return { code, severity, category, message, detail, path };
}

/** Per-gene-type reconstruction support table — Prompt 2 §5. */
export const GENE_TYPE_RECONSTRUCTION_SUPPORT: Readonly<Record<string, {
  readonly canonicalEnvelope: boolean;
  readonly structuredFragment: boolean;
  readonly notes?: string;
}>> = Object.freeze({
  scalar:        { canonicalEnvelope: true, structuredFragment: true },
  categorical:   { canonicalEnvelope: true, structuredFragment: true },
  symbolic:      { canonicalEnvelope: true, structuredFragment: true },
  vector:        { canonicalEnvelope: true, structuredFragment: true },
  temporal:      { canonicalEnvelope: true, structuredFragment: true },
  dimensional:   { canonicalEnvelope: true, structuredFragment: true },
  expression:    { canonicalEnvelope: true, structuredFragment: true },
  regulatory:    { canonicalEnvelope: true, structuredFragment: true },
  topology:      { canonicalEnvelope: true, structuredFragment: true },
  struct:        { canonicalEnvelope: true, structuredFragment: true, notes: "field-fragment lift rebuilds object; byte order may differ" },
  array:         { canonicalEnvelope: true, structuredFragment: true, notes: "single envelope carries full array" },
  graph:         { canonicalEnvelope: true, structuredFragment: true, notes: "node/edge insertion order may differ from lowering" },
  field:         { canonicalEnvelope: true, structuredFragment: false },
  quantum:       { canonicalEnvelope: true, structuredFragment: false },
  gematria:      { canonicalEnvelope: true, structuredFragment: false },
  resonance:     { canonicalEnvelope: true, structuredFragment: false },
  sovereignty:   { canonicalEnvelope: true, structuredFragment: false },
});

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
  /** Legacy string error list — kept for backwards compatibility with
   *  sabotage/canonicalization tests. New callers should consume
   *  `diagnostics` instead. */
  errors: string[];
  warnings: string[];
  /** Structured diagnostics per Prompt 2 §3. Each code is one of the
   *  six GSPL-RECONSTRUCT-* hex codes. Codes are stable; severity is
   *  either "error" (closure-critical) or "warning". */
  diagnostics: ReconstructDiagnostic[];
}

export interface IndependentVerificationResult {
  ok: boolean;
  bytesMatch: boolean;
  originalBytes: Uint8Array;
  reconstructedBytes: Uint8Array;
  errors: string[];
  fieldErrors: string[];
  /** Structured diagnostics surfaced by `reconstructSeedFromIr`. */
  diagnostics: ReconstructDiagnostic[];
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
  const diagnostics: ReconstructDiagnostic[] = [];
  const reg: GeneTypeRegistry = ctx.geneRegistry;
  const ref = graph.nodes as ReadonlyMap<string, IrReconstructableNode>;

  // ── §3 structured emit helpers ────────────────────────────────────────────
  const emit = (d: ReconstructDiagnostic): void => {
    diagnostics.push(d);
    if (d.severity === 'error') errors.push('[' + d.code + '] ' + d.message);
  };
  const seenKinds = new Set<string>();
  const seenUnknownGeneTypes = new Set<string>();
  // Inferred literal type (no `: string` annotation) to satisfy the strict
  // `gspl.canonical-seed` literal type expected by `makePrimordialSeed.schema`.
  const seedSchema = ((findMetaNode(ref, "schema")?.value as { schema?: string } | undefined)?.schema) ?? "gspl.canonical-seed";
  const seedSchemaVersion = ((findMetaNode(ref, "schema")?.value as { schemaVersion?: string } | undefined)?.schemaVersion) ?? "1.0";
  // §3 MISSING-SECTION: schema meta-node absent — fall back to canonical default.
  // Severity is WARNING (not error) because the fallback is byte-equal to `makePrimordialSeed`.
  if (!findMetaNode(ref, "schema")) emit(makeReconstructDiagnostic("GSPL-RECONSTRUCT-MISSING-SECTION", "warning", "schema meta-node absent; inferring defaults", { schema: seedSchema, schemaVersion: seedSchemaVersion }, "schema"));

  const identityNode = findMetaNode(ref, "identity");
  const identityOverrides: Partial<CanonicalSeed["identity"]> = {};
  if (identityNode?.value) {
    const idv = identityNode.value as Partial<CanonicalSeed["identity"]>;
    if (idv.authoredId !== undefined) identityOverrides.authoredId = idv.authoredId;
    if (idv.revisionId !== undefined) identityOverrides.revisionId = idv.revisionId;
    if (idv.lineageId !== undefined) identityOverrides.lineageId = idv.lineageId;
    if (idv.packageId !== undefined) identityOverrides.packageId = idv.packageId;
  }
  // §3 INCOMPLETE-IDENTITY: identity meta-node present but no identity fields
  // carried. §5 byte-equal round-trip relies on merge via Object.assign below;
  // emit warning so callers can distinguish "no identity at all" from
  // "identity node present but empty" for diagnostic tooling.
  if (identityNode && Object.keys(identityOverrides).length === 0) {
    emit(makeReconstructDiagnostic("GSPL-RECONSTRUCT-INCOMPLETE-IDENTITY", "warning", "identity meta-node present but carries no authoredId/revisionId/lineageId/packageId", { nodeId: identityNode.id }, "identity"));
  }

  const nsNode = findMetaNode(ref, "namespace");
  const namespace = nsNode?.value as CanonicalSeed["namespace"] | undefined;
  if (!nsNode) emit(makeReconstructDiagnostic("GSPL-RECONSTRUCT-MISSING-SECTION", "warning", "namespace meta-node absent; reconstructor proceeds without namespace block", undefined, "namespace"));
  const dpNode = findMetaNode(ref, "domainProfile");
  const domainProfile: CanonicalSeed["domainProfile"] = (dpNode?.value as CanonicalSeed["domainProfile"] | undefined) ?? {
    domainId: "seed", requiredCapabilities: [], optionalCapabilities: [],
  };
  if (!dpNode) emit(makeReconstructDiagnostic("GSPL-RECONSTRUCT-MISSING-SECTION", "warning", "domainProfile meta-node absent; defaulting to seed domain", { defaultedDomainId: domainProfile.domainId }, "domainProfile"));
  const intentNode = findMetaNode(ref, "intent");
  // §5 default-alignment: reconstructor fallbacks MUST EXACTLY match
  // `makePrimordialSeed` defaults in seed-ops.ts. A mismatch (e.g. "Reconstructed from IR"
  // vs "Primordial seed created by GSPL compiler") silently breaks canonical byte equality
  // for any seed whose original lacked an explicit `intent.purpose`.
  const INTENT_PRIMORDIAL_DEFAULT: CanonicalSeed["intent"] = { purpose: "Primordial seed created by GSPL compiler" };
  const intent: CanonicalSeed["intent"] = (intentNode?.value as CanonicalSeed["intent"] | undefined) ?? INTENT_PRIMORDIAL_DEFAULT;
  if (!intentNode) emit(makeReconstructDiagnostic("GSPL-RECONSTRUCT-MISSING-SECTION", "warning", "intent meta-node absent; defaulting to primordial purpose", { defaultedPurpose: intent.purpose }, "intent"));

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
    if (!KNOWN_KINDS.has(kind)) {
      // §3 UNKNOWN-KIND — surface as warning rather than silent skip so
      // malformed IR is observable without breaking byte-equal round-trip.
      if (!seenKinds.has(kind)) {
        seenKinds.add(kind);
        emit(makeReconstructDiagnostic("GSPL-RECONSTRUCT-UNKNOWN-KIND", "warning", "IR node with unregistered kind was skipped", { kind: kind, firstNodeId: node.id }, node.id));
      }
      return;
    }
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
    if (typeId === "unknown" || !reg.has(typeId)) {
      // §3 UNKNOWN-GENE-TYPE — non-registered type was assigned. Warning
      // preserved (not error) because §5 byte-equal round-trip recovers if
      // the original seed had the same gene untyped. Escalation to error
      // only happens at the verification stage.
      const t = typeId === "unknown" ? "unknown" : typeId;
      if (!seenUnknownGeneTypes.has(t)) {
        seenUnknownGeneTypes.add(t);
        emit(makeReconstructDiagnostic("GSPL-RECONSTRUCT-UNKNOWN-GENE-TYPE", "warning", "Gene reconstruction with unregistered type", { type: t, geneName }, geneName));
      }
    }
  });

  // §3 EMPTY-GENES — top-level reconstructor collected zero canonical genes.
  // Warning (not error) so the byte-equal primordial path is preserved; the
  // verification stage escalates if a non-empty source seed produced an empty
  // gene set.
  if (geneGroups.size === 0) emit(makeReconstructDiagnostic("GSPL-RECONSTRUCT-EMPTY-GENES", "warning", "Reconstruction produced zero canonical genes", { nodeCount: ref.size }, "payload.genes"));

  // §3 LIMIT-EXCEEDED — strict exclusive upper bound; emit only when the
  // reconstruction genuinely exceeds the configured limit. Severity is error
  // because continuing past the limit can silently under-cover large IR
  // graphs (limit is a deliberate resource ceiling).
  if (ctx.limits && typeof ctx.limits.maxGenes === 'number' && geneGroups.size > ctx.limits.maxGenes) {
    emit(makeReconstructDiagnostic("GSPL-RECONSTRUCT-LIMIT-EXCEEDED", "error", "Reconstructed gene count exceeds ReconstructionContext.limits.maxGenes", { got: geneGroups.size, limit: ctx.limits.maxGenes }, "limits.maxGenes"));
  }

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

  // §3 severity-based ok gate: any 'error'-severity diagnostic blocks.
  // Diagnostic list is returned in full so callers can route, filter, and
  // surface structured codes instead of substring-matching strings.
  const hasError = diagnostics.some(d => d.severity === "error");
  return { ok: !hasError, seed, errors, warnings: diagnostics.filter(d => d.severity === "warning").map(d => '[' + d.code + '] ' + d.message), diagnostics };
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
    diagnostics: result.diagnostics,
  };
}