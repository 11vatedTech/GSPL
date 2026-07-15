import { STANDARD_EFFECTS } from "@gspl/ir-model";
export function evaluateConstraint(seed) {
    var v = [];
    for (var _i = 0; _i < seed.constraints.performanceBudgets.length; _i++) {
        var b = seed.constraints.performanceBudgets[_i];
        if (b.limit <= 0)
            v.push({ constraintId: "perf-" + b.metric, message: "Invalid budget", severity: "error" });
    }
    for (var _j = 0; _j < seed.constraints.targetRestrictions.length; _j++) {
        var r = seed.constraints.targetRestrictions[_j];
        if (!r.allowed)
            v.push({ constraintId: "target-" + r.targetId, message: "Restricted: " + r.targetId, severity: "warning" });
    }
    return { ok: v.filter(function (x) { return x.severity === "error"; }).length === 0, violations: v };
}
export function authorizeEffects(seed) {
    var authorized = [];
    var denied = [];
    var diags = [];
    var p = seed.effectPermissions;
    for (var _i = 0; _i < STANDARD_EFFECTS.length; _i++) {
        var eff = STANDARD_EFFECTS[_i];
        var ok = false;
        switch (eff.kind) {
            case "filesystem-read":
                ok = p.filesystem === "read" || p.filesystem === "read-write";
                break;
            case "filesystem-write":
                ok = p.filesystem === "read-write";
                break;
            case "process-execution":
                ok = p.processExecution;
                break;
            case "network-outbound":
            case "network-inbound":
                ok = p.networkAccess;
                break;
            case "time-access":
                ok = p.timeAccess;
                break;
            case "environment-access":
                ok = p.environmentAccess;
                break;
            case "foreign-code-execution":
                ok = p.foreignCodeExecution;
                break;
            case "native-extensions":
                ok = p.nativeExtensions;
                break;
            case "model-inference":
                ok = p.modelInference;
                break;
            case "nondeterministic-input":
                ok = true;
                break;
        }
        if (ok)
            authorized.push(eff.kind);
        else {
            denied.push(eff.kind);
            diags.push({ code: "GSPL-EFFECT-DENIED", severity: "error", category: "EFFECT", message: "Denied: " + eff.kind });
        }
    }
    return { ok: denied.length === 0, authorized: authorized, denied: denied, diagnostics: diags };
}
export function enforceResourceBudgets(_s, ir, plan, artifacts) {
    var diags = [];
    var metrics = [];
    if (ir) {
        var nc = ir.nodes.size;
        metrics.push({ metric: "node-count", limit: 100000, actual: nc, unit: "nodes", exceeded: nc > 100000 });
    }
    if (plan)
        metrics.push({ metric: "operation-count", limit: 1000000, actual: plan.operations.length, unit: "ops", exceeded: plan.operations.length > 1000000 });
    if (artifacts)
        metrics.push({ metric: "artifact-count", limit: 10000, actual: artifacts.metadata.totalArtifacts, unit: "artifacts", exceeded: artifacts.metadata.totalArtifacts > 10000 });
    return { ok: diags.filter(function (d) { return d.severity === "error"; }).length === 0, diagnostics: diags, metrics: metrics };
}
export function checkInvariants(ir, plan) {
    var v = [];
    if (plan && plan.operations.length > 0 && (!ir || ir.nodes.size === 0))
        v.push("Plan has ops but IR empty");
    return { ok: v.length === 0, violations: v };
}
export function verifyPipelineOutputs(seed, ir, plan, artifacts) {
    var diags = [];
    var hasGenes = Object.keys(seed.payload.genes).length > 0;
    if (hasGenes) {
        if (!ir || ir.nodes.size <= 1)
            diags.push({ code: "GSPL-PIPE-EMPTY-IR", severity: "error", category: "GRAPH", message: "Empty IR" });
        if (!plan || plan.operations.length === 0)
            diags.push({ code: "GSPL-PIPE-EMPTY-PLAN", severity: "warning", category: "GRAPH", message: "Empty plan" });
        if (!artifacts || artifacts.artifacts.length === 0)
            diags.push({ code: "GSPL-PIPE-EMPTY-ARTIFACT-GRAPH", severity: "warning", category: "GRAPH", message: "Empty artifacts" });
    }
    return { ok: diags.filter(function (d) { return d.severity === "error"; }).length === 0, diagnostics: diags };
}
export function checkConstraintSatisfaction(c, graph) {
    for (var _i = 0; _i < c.targets.length; _i++) {
        if (!graph.nodes.has(c.targets[_i]))
            return { ok: false, message: "Missing: " + c.targets[_i] };
    }
    return { ok: true, message: "" };
}
//# sourceMappingURL=semantic-verifier.js.map