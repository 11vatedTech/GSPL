/** Reproducibility contract per Prompt 2 §5.2-5.3 */
export type OutputEquivalenceLevel = 'BYTE_IDENTICAL' | 'STRUCTURALLY_IDENTICAL' | 'SEMANTICALLY_EQUIVALENT' | 'BEHAVIORALLY_EQUIVALENT' | 'ARCHITECTURALLY_EQUIVALENT' | 'OBSERVATIONALLY_EQUIVALENT' | 'APPROXIMATE' | 'NOT_EQUIVALENT';
export declare const OUTPUT_EQUIVALENCE_LEVELS: readonly OutputEquivalenceLevel[];
export interface OutputEquivalence {
    level: OutputEquivalenceLevel;
    targetContractId: string;
    verified: boolean;
    verifiedAt?: string;
    verificationReport?: string;
}
/** Compare equivalence: returns true if a is AT LEAST as strong as b */
export declare function compareEquivalence(a: OutputEquivalenceLevel, b: OutputEquivalenceLevel): boolean;
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
//# sourceMappingURL=reproducibility.d.ts.map