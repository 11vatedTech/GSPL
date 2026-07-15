import type { ClaimStatus } from './claim.js';

export interface ClaimError {
  code: string;
  message: string;
  ids?: readonly string[];
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
