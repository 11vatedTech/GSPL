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
export const STATUS_RANK = {
    PROVEN: 8,
    IMPLEMENTED: 7,
    PARTIALLY_IMPLEMENTED: 6,
    PROTOTYPED: 5,
    THEORETICAL: 4,
    RESEARCH_REQUIRED: 3,
    UNSUPPORTED: 2,
    REFUTED: 1,
};
export const REQUIRES_EVIDENCE = new Set([
    'PROVEN',
    'IMPLEMENTED',
    'PARTIALLY_IMPLEMENTED',
    'PROTOTYPED',
]);
export function isClaimId(id) {
    return /^GSPL-CLAIM-\d{4,}$/.test(id);
}
export function claimNumber(id) {
    const m = id.match(/^GSPL-CLAIM-(\d{4,})$/);
    return m ? parseInt(m[1], 10) : null;
}
/**
 * Returns true when the claim is NOT in violation of the evidence rule.
 *  - THEORETICAL/RESEARCH_REQUIRED/UNSUPPORTED/REFUTED do NOT require evidence (return true).
 *  - PROVEN/IMPLEMENTED/PARTIALLY_IMPLEMENTED/PROTOTYPED REQUIRE evidence (true only if cited).
 */
export function isSupportedBy(c) {
    if (!REQUIRES_EVIDENCE.has(c.status))
        return true;
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
const LADDER = [
    'THEORETICAL',
    'PROTOTYPED',
    'PARTIALLY_IMPLEMENTED',
    'IMPLEMENTED',
    'PROVEN',
];
const LADDER_INDEX = (() => {
    const out = {};
    LADDER.forEach((s, i) => (out[s] = i));
    return out;
})();
export function isLadderSkip(from, to) {
    if (!(from in LADDER_INDEX) || !(to in LADDER_INDEX))
        return false;
    const a = LADDER_INDEX[from];
    const b = LADDER_INDEX[to];
    if (b <= a)
        return false; // backward or same — not a forward skip
    return b - a > 1;
}
//# sourceMappingURL=status.js.map