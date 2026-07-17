/** Canonical lowering — Authoring -> CanonicalSeed. Prompt 3 §16. */
import type { Diagnostic } from "@gspl/text-source";
import { makeDiagnostic } from "@gspl/text-source";
import type { CanonicalSeed, SeedIdentity } from "@gspl/seed-format";
import type { AuthoringProgram, AuthoringValue } from "./authoring.js";

export interface CanonicalLoweringOptions { readonly languageVersion: string; readonly domainId: string; readonly author: string; }
export var DEFAULT_LOWERING_OPTIONS: CanonicalLoweringOptions = { languageVersion: "gspl-text/1.0", domainId: "generic", author: "gspl-frontend" };
export interface CanonicalLoweringResult { readonly seed: CanonicalSeed | undefined; readonly diagnostics: readonly Diagnostic[]; readonly ok: boolean; }

function mapTypeToGeneType(tn: string): any { var m = tn.toLowerCase(); if (m==="scalar"||m==="integer"||m==="float") return "GS-001"; if(m==="string") return "GS-002"; if(m==="boolean") return "GS-003"; if(m==="absence") return "GS-004"; return "GS-001"; }
function avToAny(v: AuthoringValue): unknown { if(v.kind==="literal"){ if(v.literalKind==="integer") return parseInt(v.text,10); if(v.literalKind==="float")return parseFloat(v.text); if(v.literalKind==="boolean")return v.text==="true"; if(v.literalKind==="absence")return null; return v.text; } if(v.kind==="identifier")return v.name; if(v.kind==="binary")return{op:v.operator,left:avToAny(v.left),right:avToAny(v.right)}; if(v.kind==="unary")return{op:v.operator,operand:avToAny(v.operand)}; if(v.kind==="list"){ var a:unknown[]=[]; for(var i=0;i<v.elements.length;i++)a.push(avToAny(v.elements[i])); return a; } if(v.kind==="record"){ var r:Record<string,unknown>={}; for(var j=0;j<v.fields.length;j++)r[v.fields[j].name]=avToAny(v.fields[j].value); return r; } return undefined; }

export function lowerToCanonicalSeed(program: AuthoringProgram, options: CanonicalLoweringOptions = DEFAULT_LOWERING_OPTIONS): CanonicalLoweringResult {
  var diags: Diagnostic[] = [];
  if (!program.seed) { diags.push(makeDiagnostic({ code: "GSPL-LOWER-NO-SEED", message: "no seed declaration", severity: "error", span: { sourceId: "src:lower" as any, start: 0, end: 0 }, category: "lower", phase: "lower", canonical: true })); return { seed: undefined, diagnostics: diags, ok: false }; }
  var seed = program.seed;
  var genes: Record<string, any> = {};
  for (var i = 0; i < seed.genes.length; i++) { var g = seed.genes[i]; var v = g.value ? avToAny(g.value) : undefined; genes[g.name] = { type: mapTypeToGeneType(g.resolvedType || g.declaredType), value: v, confidence: g.confidence, locked: false }; }
  var capabilities: string[] = []; for (var j = 0; j < seed.targets.length; j++) { if (seed.targets[j].name) capabilities.push(seed.targets[j].name!); }
  var purpose = ""; for (var k = 0; k < seed.clauses.length; k++) { if (seed.clauses[k].keyword === "purpose" && seed.clauses[k].value) purpose = seed.clauses[k].value!; }
  var canonicalSeed: CanonicalSeed = { schema: "gspl.canonical-seed" as const, schemaVersion: "1.0", identity: { contentId: "" }, domainProfile: { domainId: options.domainId, requiredCapabilities: capabilities, optionalCapabilities: [] }, intent: { purpose: purpose }, payload: { schemaVersion: "1.0", genes: genes }, constraints: { valueRanges: [], structuralConditions: [], targetRestrictions: [], performanceBudgets: [], compatibilityConditions: [] }, dependencies: { contextRefs: [], knowledgeRefs: [], ruleSetRefs: [], targetContracts: [] }, entropy: { algorithm: "sha256", algorithmVersion: "1.0", rootSeed: "", channels: [] }, lineage: { operation: "primordial", parents: [], generation: 0 }, provenance: { author: options.author, tool: "gspl-frontend", canonVersion: options.languageVersion }, resourceBudget: {}, effectPermissions: { filesystem: "none", processExecution: false, networkAccess: false, environmentAccess: false, timeAccess: false, foreignCodeExecution: false, nativeExtensions: false, modelInference: false } };
  diags.sort(function(a: Diagnostic, b: Diagnostic) { return a.code.localeCompare(b.code); });
  return { seed: canonicalSeed, diagnostics: diags, ok: diags.filter(function(d: Diagnostic) { return d.severity === "error"; }).length === 0 };
}
