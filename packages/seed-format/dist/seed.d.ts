/** Canonical GSPL Seed — normative contract per Prompt 2 §4-5 */
import type { GeneTypeId } from '@gspl/gene-protocol';
export interface SeedIdentity {
    /** Content-derived identity (SHA-256) */
    contentId: string;
    /** Authored identity (human-readable, optional) */
    authoredId?: string;
    /** Revision identity */
    revisionId?: string;
    /** Lineage identity (parent chain hash) */
    lineageId?: string;
    /** Package identity (namespace + name + version) */
    packageId?: string;
}
export interface SeedNamespace {
    /** Namespace (e.g., 'com.11vatedtech') */
    domain: string;
    /** Seed name within namespace */
    name: string;
    /** Human-readable title */
    title?: string;
}
export interface DomainProfile {
    /** Domain identifier */
    domainId: string;
    /** Capability profile this seed requires */
    requiredCapabilities: string[];
    /** Optional capabilities that enhance output */
    optionalCapabilities: string[];
}
export interface DeclaredIntent {
    /** Purpose statement */
    purpose: string;
    /** Target architecture patterns */
    architecturePatterns?: string[];
    /** Non-goals (explicit boundaries) */
    nonGoals?: string[];
}
export interface TypedPayload {
    /** Schema version for the payload */
    schemaVersion: string;
    /** Genes in this seed */
    genes: Record<string, SeedGene>;
}
export interface SeedGene {
    type: GeneTypeId;
    value: unknown;
    /** Confidence (0-1) */
    confidence?: number;
    /** Whether this gene is locked (immutable) */
    locked?: boolean;
    /** Per-gene constraints */
    constraints?: SeedGeneConstraint[];
}
export interface SeedGeneConstraint {
    type: 'range' | 'enum' | 'pattern' | 'custom';
    expression: string;
    message?: string;
}
export interface SeedConstraints {
    /** Value range constraints */
    valueRanges: ConstraintExpression[];
    /** Structural conditions */
    structuralConditions: ConstraintExpression[];
    /** Target restrictions */
    targetRestrictions: TargetRestriction[];
    /** Performance budgets */
    performanceBudgets: PerformanceBudget[];
    /** Compatibility conditions */
    compatibilityConditions: CompatibilityCondition[];
}
export interface ConstraintExpression {
    id: string;
    expression: string;
    severity: 'error' | 'warning';
    description?: string;
}
export interface TargetRestriction {
    targetId: string;
    allowed: boolean;
    reason?: string;
}
export interface PerformanceBudget {
    metric: 'time' | 'memory' | 'size' | 'operations';
    limit: number;
    unit: string;
}
export interface CompatibilityCondition {
    requirement: string;
    version: string;
    operator: '>=' | '<=' | '=' | '^' | '~';
}
export interface SeedDependencies {
    /** Context package references */
    contextRefs: ContextReference[];
    /** Knowledge package references */
    knowledgeRefs: KnowledgeReference[];
    /** Rule-set package references */
    ruleSetRefs: RuleSetReference[];
    /** Target contracts */
    targetContracts: TargetContract[];
}
export interface ContextReference {
    packageId: string;
    version: string;
    contentHash: string;
}
export interface KnowledgeReference {
    packageId: string;
    version: string;
    contentHash: string;
    /** Specific components / modules used */
    components?: string[];
}
export interface RuleSetReference {
    packageId: string;
    version: string;
    contentHash: string;
    /** Specific rules activated */
    rules?: string[];
}
export interface TargetContract {
    targetId: string;
    targetType: 'source' | 'binary' | 'asset' | 'document' | 'media' | 'scene' | 'configuration' | 'composite';
    requiredCapabilities: string[];
    outputEquivalence: string;
    verificationSteps?: string[];
}
export interface DeterministicEntropyDeclaration {
    algorithm: string;
    algorithmVersion: string;
    rootSeed: string;
    channels: EntropyChannelDeclaration[];
}
export interface EntropyChannelDeclaration {
    name: string;
    derivationPath: string;
    purpose: string;
}
export interface SeedLineage {
    operation: 'primordial' | 'mutate' | 'breed' | 'compose' | 'derive' | 'fork' | 'migrate' | 'archive';
    parents: string[];
    generation: number;
}
export interface SeedProvenance {
    author?: string;
    tool?: string;
    toolVersion?: string;
    compilerVersion?: string;
    canonVersion: string;
    /** Operational audit — NOT canonical hash material */
    created?: string;
    modified?: string;
}
export interface ResourceBudget {
    maxTimeMs?: number;
    maxMemoryBytes?: number;
    maxOutputSizeBytes?: number;
    maxOperations?: number;
    maxFileCount?: number;
}
export interface EffectPermissions {
    filesystem: 'none' | 'read' | 'read-write';
    processExecution: boolean;
    networkAccess: boolean;
    environmentAccess: boolean;
    timeAccess: boolean;
    foreignCodeExecution: boolean;
    nativeExtensions: boolean;
    modelInference: boolean;
}
export interface CanonicalSeed {
    /** Schema identity */
    schema: 'gspl.canonical-seed';
    /** Schema version */
    schemaVersion: string;
    /** Seed identity */
    identity: SeedIdentity;
    /** Namespace */
    namespace?: SeedNamespace;
    /** Domain profile */
    domainProfile: DomainProfile;
    /** Declared intent */
    intent: DeclaredIntent;
    /** Typed payload (genes) */
    payload: TypedPayload;
    /** Constraints */
    constraints: SeedConstraints;
    /** Dependencies */
    dependencies: SeedDependencies;
    /** Deterministic entropy */
    entropy: DeterministicEntropyDeclaration;
    /** Lineage */
    lineage: SeedLineage;
    /** Provenance */
    provenance: SeedProvenance;
    /** Resource budget */
    resourceBudget: ResourceBudget;
    /** Effect permissions */
    effectPermissions: EffectPermissions;
    /** Validation requirements */
    validationRequirements?: string[];
    /** Compatibility requirements */
    compatibilityRequirements?: CompatibilityCondition[];
}
/** Fields included in content hash computation */
export interface HashMaterial {
    schema: string;
    schemaVersion: string;
    identity: Omit<SeedIdentity, 'contentId'>;
    namespace?: SeedNamespace;
    domainProfile: DomainProfile;
    intent: DeclaredIntent;
    payload: TypedPayload;
    constraints: SeedConstraints;
    dependencies: SeedDependencies;
    entropy: DeterministicEntropyDeclaration;
    lineage: Omit<SeedLineage, never>;
    provenance: Omit<SeedProvenance, 'created' | 'modified'> & {
        canonVersion: string;
    };
    resourceBudget: ResourceBudget;
    effectPermissions: EffectPermissions;
}
/** Fields excluded from content hash */
export interface NonHashMetadata {
    identity: Pick<SeedIdentity, 'contentId'>;
    provenance: Pick<SeedProvenance, 'created' | 'modified'>;
    validationRequirements?: string[];
    compatibilityRequirements?: CompatibilityCondition[];
    /** Any authoring-only annotations */
    annotations?: Record<string, unknown>;
}
//# sourceMappingURL=seed.d.ts.map