/**
 * Type definitions for the GSPL claim-classifier, aligned to the user-spec
 * Prompt 1 section 5 schema.
 *
 * A Claim is a discrete proposition about GSPL. Each carries:
 *   - a stable claimId (GSPL-CLAIM-NNNN),
 *   - an 8-status taxonomy (PROVEN..REFUTED),
 *   - a statement body,
 *   - scope and conditions,
 *   - cited evidence,
 *   - counter-evidence,
 *   - verification method,
 *   - falsification criteria,
 *   - related invention ids,
 *   - last-reviewed date.
 *
 * INVARIANT: statuses above THEORETICAL require evidence. Below or equal to
 * THEORETICAL are claims without proof.
 */

export type ClaimStatus =
  | 'PROVEN'
  | 'IMPLEMENTED'
  | 'PARTIALLY_IMPLEMENTED'
  | 'PROTOTYPED'
  | 'THEORETICAL'
  | 'RESEARCH_REQUIRED'
  | 'UNSUPPORTED'
  | 'REFUTED';

export interface ClaimEvidenceRef {
  repo: string;
  file: string;
  location?: string;
  commit?: string;
}

export interface Claim {
  /** Stable canonical id, format: GSPL-CLAIM-NNNN */
  claimId: string;
  /** Claim body — one or a few sentences. */
  statement: string;
  /** Status of the claim. */
  status: ClaimStatus;
  /** Scope: explicit statement of where the claim applies and where it does not. */
  scope: string;
  /** Conditions under which the claim holds. */
  conditions: readonly string[];
  /** Evidence references REQUIRED for statuses above THEORETICAL. */
  evidence: readonly ClaimEvidenceRef[];
  /** Evidence that argues against the claim. */
  counterEvidence: readonly ClaimEvidenceRef[];
  /** How this claim can be verified. */
  verificationMethod: string;
  /** What would falsify this claim. */
  falsificationCriteria: readonly string[];
  /** Inventions related to this claim. */
  relatedInventions: readonly string[];
  /** ISO date of last review. */
  lastReviewed: string;
}

export interface ClaimRegistry {
  schema: 'gspl.claims';
  schemaVersion: '1.0';
  generatedAt: string;
  claims: readonly Claim[];
}

export interface ClaimCheckReport {
  schema: 'gspl.claims-report';
  schemaVersion: '1.0';
  generatedAt: string;
  ok: boolean;
  errors: readonly ClaimError[];
  warnings: readonly ClaimError[];
  summary: {
    claimsChecked: number;
    byStatus: Readonly<Record<ClaimStatus, number>>;
    illegalTransitions: readonly { claimId: string; from: ClaimStatus; to: ClaimStatus; since: string }[];
    unsupportedClaims: readonly string[];
  };
}

export interface ClaimError {
  code: string;
  message: string;
  ids?: readonly string[];
}

const ALL_STATUSES = [
  'PROVEN',
  'IMPLEMENTED',
  'PARTIALLY_IMPLEMENTED',
  'PROTOTYPED',
  'THEORETICAL',
  'RESEARCH_REQUIRED',
  'UNSUPPORTED',
  'REFUTED',
] as const;

export const ALL_CLAIM_STATUSES = ALL_STATUSES;
