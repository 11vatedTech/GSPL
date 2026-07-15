/** Reproducibility contract per Prompt 2 §5.2-5.3 */

export type OutputEquivalenceLevel =
  | 'BYTE_IDENTICAL'
  | 'STRUCTURALLY_IDENTICAL'
  | 'SEMANTICALLY_EQUIVALENT'
  | 'BEHAVIORALLY_EQUIVALENT'
  | 'ARCHITECTURALLY_EQUIVALENT'
  | 'OBSERVATIONALLY_EQUIVALENT'
  | 'APPROXIMATE'
  | 'NOT_EQUIVALENT';

export const OUTPUT_EQUIVALENCE_LEVELS: readonly OutputEquivalenceLevel[] = [
  'BYTE_IDENTICAL',
  'STRUCTURALLY_IDENTICAL',
  'SEMANTICALLY_EQUIVALENT',
  'BEHAVIORALLY_EQUIVALENT',
  'ARCHITECTURALLY_EQUIVALENT',
  'OBSERVATIONALLY_EQUIVALENT',
  'APPROXIMATE',
  'NOT_EQUIVALENT',
];

const EQUIVALENCE_ORDER: Record<OutputEquivalenceLevel, number> = {
  BYTE_IDENTICAL: 0,
  STRUCTURALLY_IDENTICAL: 1,
  SEMANTICALLY_EQUIVALENT: 2,
  BEHAVIORALLY_EQUIVALENT: 3,
  ARCHITECTURALLY_EQUIVALENT: 4,
  OBSERVATIONALLY_EQUIVALENT: 5,
  APPROXIMATE: 6,
  NOT_EQUIVALENT: 7,
};

export interface OutputEquivalence {
  level: OutputEquivalenceLevel;
  targetContractId: string;
  verified: boolean;
  verifiedAt?: string;
  verificationReport?: string;
}

/** Compare equivalence: returns true if a is AT LEAST as strong as b */
export function compareEquivalence(a: OutputEquivalenceLevel, b: OutputEquivalenceLevel): boolean {
  return (EQUIVALENCE_ORDER[a] ?? 7) <= (EQUIVALENCE_ORDER[b] ?? 7);
}

/** Reproducibility tuple per §5.2 */
export interface ReproducibilityTuple {
  canonicalSeedHash: string;
  canonicalCompilerVersion: string;
  canonVersion: string;
  knowledgePackageVersions: Record<string, string>;
  rulePackageVersions: Record<string, string>;
  targetContractVersion: string;
  deterministicRuntimeProfile: string;
  declaredEnvironment: DeclaredEnvironment;
}

export interface DeclaredEnvironment {
  os?: string;
  arch?: string;
  nodeVersion?: string;
  /** Any declared environment variables (values redacted for security) */
  envKeys?: string[];
}
