/**
 * Status taxonomy, ordering, and transition rules for the claim classifier.
 *
 * Statuses are ranked from REFUTED (weakest) to PROVEN (strongest):
 *
 *   PROVEN  >  IMPLEMENTED  >  PARTIALLY_IMPLEMENTED  >  PROTOTYPED
 *       >  THEORETICAL  >  RESEARCH_REQUIRED  >  UNSUPPORTED  >  REFUTED
 *
 * Evidence REQUIRED for any status at or above PROTOTYPED (rank >= 5).
 *
 * Forward legal transitions (with at least equal evidence at each step):
 *   THEORETICAL -> PROTOTYPED -> PARTIALLY_IMPLEMENTED -> IMPLEMENTED -> PROVEN
 * Backward transitions:
 *   any -> REFUTED (when a falsification criterion is met)
 *   any -> RESEARCH_REQUIRED (when a new question is opened)
 *   PROTOTYPED+ -> THEORETICAL (if implementation is retracted)
 *
 * Skipping a forward state is allowed ONLY when the next-state evidence is
 * explicitly stronger than the skipped evidence. Skipping more than one step
 * is reported as an illegal transition and a CI error.
 *
 * `isSupportedBy` reports whether a claim is NOT in violation of the
 * evidence rule: returns true if either (a) the status does not require
 * evidence (THEORETICAL or below) or (b) the status requires evidence and
 * evidence is present.
 */
import type { Claim, ClaimStatus } from './types.js';
export declare const STATUS_RANK: Record<ClaimStatus, number>;
export declare const REQUIRES_EVIDENCE: ReadonlySet<ClaimStatus>;
export declare function isClaimId(id: string): boolean;
export declare function claimNumber(id: string): number | null;
/**
 * Returns true when the claim is NOT in violation of the evidence rule.
 *  - THEORETICAL/RESEARCH_REQUIRED/UNSUPPORTED/REFUTED do NOT require evidence (return true).
 *  - PROVEN/IMPLEMENTED/PARTIALLY_IMPLEMENTED/PROTOTYPED REQUIRE evidence (true only if cited).
 */
export declare function isSupportedBy(c: Claim): boolean;
export declare function isLadderSkip(from: ClaimStatus, to: ClaimStatus): boolean;
//# sourceMappingURL=status.d.ts.map