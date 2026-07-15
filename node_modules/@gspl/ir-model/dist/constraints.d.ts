import type { CapabilityID, EffectID } from "./graph.js";
/** Constraint, capability, and effect model — Prompt 2 §8 */
export type ConstraintKind = 'value-range' | 'structural' | 'target-restriction' | 'performance-budget' | 'compatibility' | 'dependency-requirement' | 'custom';
export interface Constraint {
    id: string;
    kind: ConstraintKind;
    description: string;
    expression: string;
    severity: 'error' | 'warning' | 'info';
    /** Node IDs this constraint applies to */
    targets: string[];
}
export interface Invariant {
    id: string;
    description: string;
    /** Condition that must remain true across transformations */
    condition: string;
    /** What transformation phases this invariant guards */
    phases: ('normalization' | 'lowering' | 'planning' | 'projection' | 'expansion')[];
}
export interface CapabilityDeclaration {
    id: string;
    name: string;
    description: string;
    /** Whether this capability is required or optional */
    required: boolean;
    /** What operations this capability enables */
    enables: string[];
}
export interface Capability {
    id: CapabilityID;
    declaration: CapabilityDeclaration;
    /** Whether this capability has been granted */
    granted: boolean;
    /** Grant source: explicit, inherited, or denied */
    grantSource: 'explicit' | 'inherited' | 'denied';
}
export type EffectKind = 'filesystem-read' | 'filesystem-write' | 'process-execution' | 'network-outbound' | 'network-inbound' | 'nondeterministic-input' | 'time-access' | 'environment-access' | 'foreign-code-execution' | 'native-extensions' | 'model-inference';
export interface EffectDeclaration {
    kind: EffectKind;
    description: string;
    /** Whether this effect is permitted by default */
    defaultPermitted: boolean;
    /** What capability grants this effect */
    requiredCapability?: string;
}
export interface Effect {
    id: EffectID;
    kind: EffectKind;
    /** Whether this effect has been granted */
    permitted: boolean;
    /** Grant source */
    grantSource: 'explicit' | 'capability' | 'denied';
    /** The capability that authorized this effect */
    authorizingCapability?: string;
    /** Scope: which nodes are affected */
    scope: string[];
}
/** Canonical expansion defaults to NO effects */
export declare const DEFAULT_EFFECT_PERMISSIONS: Record<EffectKind, boolean>;
/** Standard effect declarations */
export declare const STANDARD_EFFECTS: EffectDeclaration[];
//# sourceMappingURL=constraints.d.ts.map