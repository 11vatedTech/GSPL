import type { ProvenanceSource } from './evidence.js';
export type ClaimStatus = 'PROVEN' | 'IMPLEMENTED' | 'PARTIALLY_IMPLEMENTED' | 'PROTOTYPED' | 'THEORETICAL' | 'RESEARCH_REQUIRED' | 'UNSUPPORTED' | 'REFUTED';
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
//# sourceMappingURL=claim.d.ts.map