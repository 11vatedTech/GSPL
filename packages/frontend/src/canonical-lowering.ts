/** Canonical lowering — Authoring -> CanonicalSeed. Prompt 3 §16. */
import { createHash } from "node:crypto";
import type { Diagnostic } from "@gspl/text-source";
import { makeDiagnostic } from "@gspl/text-source";
import type { CanonicalSeed } from "@gspl/seed-format";
import { canonicalizeSeed } from "@gspl/seed-format";
import type { GeneTypeId } from "@gspl/gene-protocol";
import type { AuthoringProgram, AuthoringValue, AuthoringGene } from "./authoring.js";

export interface CanonicalLoweringOptions { readonly languageVersion: string; readonly domainId: string; readonly author: string; }
export var DEFAULT_LOWERING_OPTIONS: CanonicalLoweringOptions = { languageVersion: "gspl-text/1.0", domainId: "generic", author: "gspl-frontend" };
export interface CanonicalLoweringResult {
  readonly seed: CanonicalSeed | undefined;
  readonly diagnostics: readonly Diagnostic[];
  readonly ok: boolean;
  readonly desugaringTrace: readonly DesugaringEntry[];
  readonly normalizationTrace: readonly NormalizationEntry[];
}
export interface DesugaringEntry { readonly rule: string; readonly original: string; readonly desugared: string; readonly span: { sourceId: string; start: number; end: number }; }
export interface NormalizationEntry { readonly original: string; readonly normalized: string; }

var TYPE_GENE_MAP: Record<string, GeneTypeId> = {
  "scalar": "GS-001" as GeneTypeId,
  "integer": "GS-001" as GeneTypeId,
  "float": "GS-001" as GeneTypeId,
  "string": "GS-002" as GeneTypeId,
  "boolean": "GS-003" as GeneTypeId,
  "absence": "GS-004" as GeneTypeId,
  "any": "GS-001" as GeneTypeId,
};

function mapTypeToGeneType(tn: string, diags: Diagnostic[]): GeneTypeId | null {
  var m = tn.toLowerCase();
  var mapped = TYPE_GENE_MAP[m];
  if (mapped) return mapped;
  diags.push(makeDiagnostic({
    code: "GSPL-LOWER-UNKNOWN-TYPE",
    message: "unknown type \"" + tn + "\" in canonical lowering — cannot produce canonical seed",
    severity: "error",
    span: { sourceId: "src:lower" as any, start: 0, end: 0 },
    category: "lower", phase: "lower", canonical: true,
  }));
  return null;
}

function parseInteger(text: string, diags: Diagnostic[]): number {
  if (text.startsWith("0x") || text.startsWith("0X")) return parseInt(text, 16);
  if (text.startsWith("0b") || text.startsWith("0B")) return parseInt(text.slice(2), 2);
  if (text.startsWith("0o") || text.startsWith("0O")) return parseInt(text.slice(2), 8);
  return parseInt(text, 10);
}

function parseFloatSafe(text: string, diags: Diagnostic[]): number {
  if (text === "Infinity" || text === "-Infinity" || text === "NaN") {
    diags.push(makeDiagnostic({
      code: "GSPL-LOWER-NONFINITE-NUMERIC",
      message: "non-finite numeric literal \"" + text + "\" in canonical lowering",
      severity: "error",
      span: { sourceId: "src:lower" as any, start: 0, end: 0 },
      category: "lower", phase: "lower", canonical: true,
    }));
    return 0;
  }
  return parseFloat(text);
}

function avToAny(v: AuthoringValue, diags: Diagnostic[]): unknown {
  if (v.kind === "literal") {
    if (v.literalKind === "integer") return parseInteger(v.text, diags);
    if (v.literalKind === "float") return parseFloatSafe(v.text, diags);
    if (v.literalKind === "boolean") return v.text === "true";
    if (v.literalKind === "absence") return null;
    return v.text;
  }
  if (v.kind === "identifier") return v.name;
  if (v.kind === "binary") return { op: v.operator, left: avToAny(v.left, diags), right: avToAny(v.right, diags) };
  if (v.kind === "unary") return { op: v.operator, operand: avToAny(v.operand, diags) };
  if (v.kind === "list") { var a: unknown[] = []; for (var i = 0; i < v.elements.length; i++) a.push(avToAny(v.elements[i], diags)); return a; }
  if (v.kind === "record") { var r: Record<string, unknown> = {}; for (var j = 0; j < v.fields.length; j++) r[v.fields[j].name] = avToAny(v.fields[j].value, diags); return r; }
  return undefined;
}

export function lowerToCanonicalSeed(program: AuthoringProgram, options: CanonicalLoweringOptions = DEFAULT_LOWERING_OPTIONS): CanonicalLoweringResult {
  var diags: Diagnostic[] = [];
  if (!program.seed) {
    diags.push(makeDiagnostic({ code: "GSPL-LOWER-NO-SEED", message: "no seed declaration", severity: "error", span: { sourceId: "src:lower" as any, start: 0, end: 0 }, category: "lower", phase: "lower", canonical: true }));
    return { seed: undefined, diagnostics: diags, ok: false, desugaringTrace: [], normalizationTrace: [] };
  }
  var seed = program.seed;
  var genes: Record<string, any> = {};
  var hasFatalTypeError = false;
  for (var i = 0; i < seed.genes.length; i++) {
    var g = seed.genes[i];
    var declaredType = (g as any).declaredType || (g as any).resolvedType || "scalar";
    var geneType = mapTypeToGeneType(declaredType, diags);
    if (geneType === null) { hasFatalTypeError = true; continue; }
    // Only evaluate value after type check passes
    var v = g.value ? avToAny(g.value, diags) : undefined;
    genes[g.name] = { type: geneType, value: v, confidence: g.confidence, locked: false };
  }
  if (hasFatalTypeError) {
    return { seed: undefined, diagnostics: diags, ok: false, desugaringTrace: [], normalizationTrace: [] };
  }
  var capabilities: string[] = [];
  for (var j = 0; j < seed.targets.length; j++) { var tName = seed.targets[j].name; if (tName) capabilities.push(tName); }
  var purpose = "";
  for (var k = 0; k < seed.clauses.length; k++) { if (seed.clauses[k].keyword === "purpose" && seed.clauses[k].value) purpose = seed.clauses[k].value as string; }

  // Derive root seed from entropy clauses if present
  var rootSeed = "";
  var entropyClauses = seed.entropy;
  if (entropyClauses && entropyClauses.length > 0) {
    var entropyHash = createHash("sha256");
    for (var e = 0; e < entropyClauses.length; e++) {
      entropyHash.update(entropyClauses[e].keyword + "\0" + (entropyClauses[e].value || ""));
    }
    rootSeed = "sha256:" + entropyHash.digest("hex");
  }

  // Lower authored constraints, entropy channels, effects, budgets from seed
  var valueRanges: any[] = [];
  var structuralConditions: any[] = [];
  var perfBudgets: any[] = [];
  for (var ci = 0; ci < seed.constraints.length; ci++) {
    var ck = seed.constraints[ci].keyword;
    var cv = seed.constraints[ci].value;
    if (ck === "budget" || ck === "perf") perfBudgets.push({ label: ck, value: cv });
    else if (ck === "range" || ck === "min" || ck === "max") valueRanges.push({ constraint: ck, value: cv });
    else structuralConditions.push({ condition: ck, value: cv });
  }

  var entropyChannels: any[] = [];
  for (var ei = 0; ei < seed.entropy.length; ei++) {
    entropyChannels.push({ source: seed.entropy[ei].keyword, seed: seed.entropy[ei].value || "" });
  }

  var effectPerms: any = { filesystem: "none", processExecution: false, networkAccess: false, environmentAccess: false, timeAccess: false, foreignCodeExecution: false, nativeExtensions: false, modelInference: false };
  for (var fi = 0; fi < seed.effects.length; fi++) {
    var ek = seed.effects[fi].keyword;
    var ev = seed.effects[fi].value;
    if (ek === "filesystem") effectPerms.filesystem = ev || "none";
    else if (ek === "process" || ek === "exec") effectPerms.processExecution = ev === "true" || ev === "allow";
    else if (ek === "network") effectPerms.networkAccess = ev === "true" || ev === "allow";
    else if (ek === "env" || ek === "environment") effectPerms.environmentAccess = ev === "true" || ev === "allow";
    else if (ek === "time") effectPerms.timeAccess = ev === "true" || ev === "allow";
    else if (ek === "ffi" || ek === "foreign") effectPerms.foreignCodeExecution = ev === "true" || ev === "allow";
    else if (ek === "native") effectPerms.nativeExtensions = ev === "true" || ev === "allow";
    else if (ek === "inference" || ek === "model") effectPerms.modelInference = ev === "true" || ev === "allow";
    else { diags.push(makeDiagnostic({ code: "GSPL-LOWER-UNKNOWN-EFFECT", message: "unknown effect keyword: " + ek, severity: "warning", span: { sourceId: "src:lower" as any, start: 0, end: 0 }, category: "lower", phase: "lower", canonical: true })); }
  }

  var resourceBudget: any = {};
  for (var bi = 0; bi < seed.budget.length; bi++) {
    var bk = seed.budget[bi].keyword;
    var bv = seed.budget[bi].value;
    if (bv) resourceBudget[bk] = bv;
  }

  var dependencies: any = { contextRefs: [] as any[], knowledgeRefs: [] as any[], ruleSetRefs: [] as any[], targetContracts: [] as any[] };
  for (var ti = 0; ti < seed.targets.length; ti++) {
    var t = seed.targets[ti];
    if (t.name) dependencies.targetContracts.push({ name: t.name, type: t.targetType || "any" });
  }

  var desugaringTrace: DesugaringEntry[] = [];
  var normalizationTrace: NormalizationEntry[] = [];

  // Record desugaring for simple sugars (e.g., gene without type annotation → default scalar)
  for (var di = 0; di < seed.genes.length; di++) {
    var dg = seed.genes[di];
    var dt = (dg as any).declaredType || "";
    if (!dt || dt === "") {
      desugaringTrace.push({
        rule: "type-inference",
        original: dg.name + " (inferred)",
        desugared: dg.name + ": scalar",
        span: { sourceId: "src:lower" as any, start: 0, end: 0 }
      });
    }
  }

  // Record normalization for every gene with non-ASCII name
  for (var ni = 0; ni < seed.genes.length; ni++) {
    var ng = seed.genes[ni];
    if (ng.name !== ng.normalizedName) {
      normalizationTrace.push({ original: ng.name, normalized: ng.normalizedName });
    }
  }

  var canonicalSeed: CanonicalSeed = {
    schema: "gspl.canonical-seed" as const,
    schemaVersion: "1.0",
    identity: { contentId: "" },
    domainProfile: { domainId: options.domainId, requiredCapabilities: capabilities, optionalCapabilities: [] },
    intent: { purpose: purpose },
    payload: { schemaVersion: "1.0", genes: genes },
    constraints: { valueRanges: valueRanges, structuralConditions: structuralConditions, targetRestrictions: [], performanceBudgets: perfBudgets, compatibilityConditions: [] },
    dependencies: dependencies,
    entropy: { algorithm: "sha256", algorithmVersion: "1.0", rootSeed: rootSeed, channels: entropyChannels },
    lineage: { operation: "primordial", parents: [], generation: 0 },
    provenance: { author: options.author, tool: "gspl-frontend", canonVersion: options.languageVersion },
    resourceBudget: resourceBudget,
    effectPermissions: effectPerms,
  };

  // Compute content identity using Prompt 2 canonical serializer
  try {
    var canonicalBytes = canonicalizeSeed(canonicalSeed);
    var hash = createHash("sha256");
    hash.update(canonicalBytes);
    canonicalSeed.identity.contentId = "sha256:" + hash.digest("hex");
  } catch (e) {
    // Fallback: use structured fields
    var hash = createHash("sha256");
    hash.update(JSON.stringify(canonicalSeed.payload));
    hash.update(JSON.stringify(canonicalSeed.domainProfile));
    hash.update(JSON.stringify(canonicalSeed.intent));
    hash.update(JSON.stringify(canonicalSeed.entropy));
    canonicalSeed.identity.contentId = "sha256:" + hash.digest("hex");
  }

  diags.sort(function(a: Diagnostic, b: Diagnostic) { return a.code.localeCompare(b.code); });
  return { seed: canonicalSeed, diagnostics: diags, ok: diags.filter(function(d: Diagnostic) { return d.severity === "error"; }).length === 0, desugaringTrace: desugaringTrace, normalizationTrace: normalizationTrace };
}
