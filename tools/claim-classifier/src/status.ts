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

export const STATUS_RANK: Record<ClaimStatus, number> = {
  PROVEN: 8,
  IMPLEMENTED: 7,
  PARTIALLY_IMPLEMENTED: 6,
  PROTOTYPED: 5,
  THEORETICAL: 4,
  RESEARCH_REQUIRED: 3,
  UNSUPPORTED: 2,
  REFUTED: 1,
};

export const REQUIRES_EVIDENCE: ReadonlySet<ClaimStatus> = new Set<ClaimStatus>([
  'PROVEN',
  'IMPLEMENTED',
  'PARTIALLY_IMPLEMENTED',
  'PROTOTYPED',
]);

export function isClaimId(id: string): boolean {
  return /^GSPL-CLAIM-\d{4,}$/.test(id);
}

export function claimNumber(id: string): number | null {
  const m = id.match(/^GSPL-CLAIM-(\d{4,})$/);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * Returns true when the claim is NOT in violation of the evidence rule.
 *  - THEORETICAL/RESEARCH_REQUIRED/UNSUPPORTED/REFUTED do NOT require evidence (return true).
 *  - PROVEN/IMPLEMENTED/PARTIALLY_IMPLEMENTED/PROTOTYPED REQUIRE evidence (true only if cited).
 */
export function isSupportedBy(c: Claim): boolean {
  if (!REQUIRES_EVIDENCE.has(c.status)) return true;
  return (c.evidence?.length ?? 0) > 0;
}

/**
 * Forward transition ladder (canonical):
 *   THEORETICAL = 4
 *   PROTOTYPED = 5
 *   PARTIALLY_IMPLEMENTED = 6
 *   IMPLEMENTED = 7
 *   PROVEN = 8
 *
 * The ladder is the only legal ascending path; one-step skips are tolerated
 * only with explicit stronger evidence referenced in `verificationMethod` or
 * the claim body.
 */
const LADDER: readonly ClaimStatus[] = [
  'THEORETICAL',
  'PROTOTYPED',
  'PARTIALLY_IMPLEMENTED',
  'IMPLEMENTED',
  'PROVEN',
];

const LADDER_INDEX: Readonly<Record<ClaimStatus, number>> = (() => {
  const out: Partial<Record<ClaimStatus, number>> = {};
  LADDER.forEach((s, i) => (out[s] = i));
  return out as Record<ClaimStatus, number>;
})();

export function isLadderSkip(from: ClaimStatus, to: ClaimStatus): boolean {
  if (!(from in LADDER_INDEX) || !(to in LADDER_INDEX)) return false;
  const a = LADDER_INDEX[from];
  const b = LADDER_INDEX[to];
  if (b <= a) return false; // backward or same — not a forward skip
  return b - a > 1;
}
