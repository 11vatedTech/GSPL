/**
 * Local types for the bootstrap. Mirrors provenance-checker and
 * claim-classifier shapes verbatim. Kept local so other tools can stay
 * narrow and the bootstrap can run even if a tool type drifts.
 */
export type Disposition = 'ADOPT' | 'ADAPT' | 'REWRITE' | 'RESEARCH' | 'ARCHIVE' | 'REJECT';
export type ImplementationStatus = 'spec-only' | 'partial' | 'complete';
export type ClaimStatus = 'PROVEN' | 'IMPLEMENTED' | 'PARTIALLY_IMPLEMENTED' | 'PROTOTYPED' | 'THEORETICAL' | 'RESEARCH_REQUIRED' | 'UNSUPPORTED' | 'REFUTED';
export type TargetSubsystem = 'kernel' | 'gene-system' | 'language' | 'compiler' | 'runtime' | 'interoperability' | 'translation-bridge' | 'package-system' | 'canon-governance';
export interface ProvenanceSource {
    repo: string;
    file: string;
    location?: string;
    commit?: string;
}
export interface InventionEntry {
    id: string;
    canonicalName: string;
    aliases: readonly string[];
    founderIntent: string;
    definition: string;
    problemSolved: string;
    evidence: readonly ProvenanceSource[];
    implementationStatus: ImplementationStatus;
    claimStatus: ClaimStatus | null;
    dependencies: readonly string[];
    conflicts: readonly string[];
    risks: readonly string[];
    disposition: Disposition;
    targetSubsystem: TargetSubsystem;
    createdAtPolicy: string;
    schemaVersion: '1.0';
}
export interface ArchitectureDecisionEntry {
    id: string;
    subsystem: string;
    disposition: Disposition;
    rationale: string;
    references: readonly string[];
    evidence: readonly ProvenanceSource[];
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}
export type SourceType = 'spec' | 'code' | 'doc' | 'test' | 'archive' | 'config';
export type SourceAvailability = 'available' | 'archive-only' | 'reproducibly-extractable';
export type SourceVerificationStatus = 'verified' | 'pending' | 'failed';
export interface SourceRecord {
    sourceId: string;
    repositoryId: string;
    repositoryPath: string;
    relativePath: string;
    contentHash: string;
    sourceType: SourceType;
    language: string;
    symbolOrSection: string;
    availability: SourceAvailability;
    verificationStatus: SourceVerificationStatus;
    notes: string;
}
export interface InventionRegistry {
    schema: 'gspl.invention-ledger';
    schemaVersion: '1.0';
    generatedAt: string;
    inventions: readonly InventionEntry[];
}
export interface SourceRegistry {
    schema: 'gspl.sources';
    schemaVersion: '1.0';
    generatedAt: string;
    sources: readonly SourceRecord[];
}
export interface Claim {
    claimId: string;
    statement: string;
    status: ClaimStatus;
    scope: string;
    conditions: readonly string[];
    evidence: readonly ProvenanceSource[];
    counterEvidence: readonly ProvenanceSource[];
    verificationMethod: string;
    falsificationCriteria: readonly string[];
    relatedInventions: readonly string[];
    lastReviewed: string;
}
export interface ClaimRegistry {
    schema: 'gspl.claims';
    schemaVersion: '1.0';
    generatedAt: string;
    claims: readonly Claim[];
}
//# sourceMappingURL=types.d.ts.map