import type { CapabilityID, EffectID } from "./graph.js";
/** Constraint, capability, and effect model — Prompt 2 §8 */

// ── Constraints ──

export type ConstraintKind =
  | 'value-range'
  | 'structural'
  | 'target-restriction'
  | 'performance-budget'
  | 'compatibility'
  | 'dependency-requirement'
  | 'custom';

export interface Constraint {
  id: string;
  kind: ConstraintKind;
  description: string;
  expression: string;
  severity: 'error' | 'warning' | 'info';
  /** Node IDs this constraint applies to */
  targets: string[];
}

// ── Invariants ──

export interface Invariant {
  id: string;
  description: string;
  /** Condition that must remain true across transformations */
  condition: string;
  /** What transformation phases this invariant guards */
  phases: ('normalization' | 'lowering' | 'planning' | 'projection' | 'expansion')[];
}

// ── Capabilities ──

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

// ── Effects ──

export type EffectKind =
  | 'filesystem-read'
  | 'filesystem-write'
  | 'process-execution'
  | 'network-outbound'
  | 'network-inbound'
  | 'nondeterministic-input'
  | 'time-access'
  | 'environment-access'
  | 'foreign-code-execution'
  | 'native-extensions'
  | 'model-inference';

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

// ── Defaults ──

/** Canonical expansion defaults to NO effects */
export const DEFAULT_EFFECT_PERMISSIONS: Record<EffectKind, boolean> = {
  'filesystem-read': false,
  'filesystem-write': false,
  'process-execution': false,
  'network-outbound': false,
  'network-inbound': false,
  'nondeterministic-input': false,
  'time-access': false,
  'environment-access': false,
  'foreign-code-execution': false,
  'native-extensions': false,
  'model-inference': false,
};

/** Standard effect declarations */
export const STANDARD_EFFECTS: EffectDeclaration[] = [
  { kind: 'filesystem-read', description: 'Read files from the filesystem', defaultPermitted: false },
  { kind: 'filesystem-write', description: 'Write files to the filesystem', defaultPermitted: false },
  { kind: 'process-execution', description: 'Execute child processes', defaultPermitted: false },
  { kind: 'network-outbound', description: 'Make outbound network requests', defaultPermitted: false },
  { kind: 'network-inbound', description: 'Accept inbound network connections', defaultPermitted: false },
  { kind: 'nondeterministic-input', description: 'Read nondeterministic input', defaultPermitted: false },
  { kind: 'time-access', description: 'Access wall-clock time', defaultPermitted: false },
  { kind: 'environment-access', description: 'Access environment variables', defaultPermitted: false },
  { kind: 'foreign-code-execution', description: 'Execute code from external sources', defaultPermitted: false },
  { kind: 'native-extensions', description: 'Load native binary extensions', defaultPermitted: false },
  { kind: 'model-inference', description: 'Run AI model inference', defaultPermitted: false },
];
