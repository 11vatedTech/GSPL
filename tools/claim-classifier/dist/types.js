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
const ALL_STATUSES = [
    'PROVEN',
    'IMPLEMENTED',
    'PARTIALLY_IMPLEMENTED',
    'PROTOTYPED',
    'THEORETICAL',
    'RESEARCH_REQUIRED',
    'UNSUPPORTED',
    'REFUTED',
];
export const ALL_CLAIM_STATUSES = ALL_STATUSES;
//# sourceMappingURL=types.js.map