/** Semantic Verifier */
import type { CanonicalSeed } from "@gspl/seed-format";
import type { GsplIrGraph, Constraint, Diagnostic } from "@gspl/ir-model";
import type { ExpansionPlan } from "./expansion-plan.js";
import type { TargetArtifactGraph } from "./artifact-graph.js";
export interface ConstraintCheckResult {
    ok: boolean;
    violations: {
        constraintId: string;
        message: string;
        severity: "error" | "warning";
    }[];
}
export interface EffectAuthResult {
    ok: boolean;
    authorized: string[];
    denied: string[];
    diagnostics: Diagnostic[];
}
export interface BudgetCheckResult {
    ok: boolean;
    diagnostics: Diagnostic[];
    metrics: {
        metric: string;
        limit: number;
        actual: number;
        unit: string;
        exceeded: boolean;
    }[];
}
export declare function evaluateConstraint(seed: CanonicalSeed): ConstraintCheckResult;
export declare function authorizeEffects(seed: CanonicalSeed): EffectAuthResult;
export declare function enforceResourceBudgets(_s: CanonicalSeed, ir?: GsplIrGraph, plan?: ExpansionPlan, artifacts?: TargetArtifactGraph): BudgetCheckResult;
export declare function checkInvariants(ir?: GsplIrGraph, plan?: ExpansionPlan): {
    ok: boolean;
    violations: string[];
};
export declare function verifyPipelineOutputs(seed: CanonicalSeed, ir?: GsplIrGraph, plan?: ExpansionPlan, artifacts?: TargetArtifactGraph): {
    ok: boolean;
    diagnostics: Diagnostic[];
};
export declare function checkConstraintSatisfaction(c: Constraint, graph: GsplIrGraph): {
    ok: boolean;
    message: string;
};
//# sourceMappingURL=semantic-verifier.d.ts.map