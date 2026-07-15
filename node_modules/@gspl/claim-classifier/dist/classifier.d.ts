/**
 * The claim classifier aligned to the user-spec schema.
 *
 * For each claim:
 *   - id format check
 *   - duplicate detection
 *   - empty statement detection
 *   - status membership check
 *   - evidence presence for statuses at or above PROTOTYPED
 *   - lastReviewed and verificationMethod non-empty
 *   - scope and conditions non-empty
 *   - falsification criteria non-empty for statuses at or above PROTOTYPED
 *   - relatedInventions is non-empty (warn if empty)
 *   - ladder-skip transition detection (warn by default; promote to error if expectedStepFrom is set)
 */
import type { ClaimCheckReport, ClaimRegistry, ClaimStatus } from './types.js';
export interface ClassifyOptions {
    /** Optional: list of expected status transitions to detect, e.g. [{ from: 'PROTOTYPED', to: 'IMPLEMENTED' }] */
    expectedSteps?: readonly {
        from: ClaimStatus;
        to: ClaimStatus;
        since: string;
    }[];
}
export declare function classify(registry: ClaimRegistry, options?: ClassifyOptions): ClaimCheckReport;
//# sourceMappingURL=classifier.d.ts.map