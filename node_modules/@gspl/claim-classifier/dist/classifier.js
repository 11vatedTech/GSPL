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
import { isClaimId, isLadderSkip, REQUIRES_EVIDENCE, STATUS_RANK } from './status.js';
export function classify(registry, options = {}) {
    const errors = [];
    const warnings = [];
    const seen = new Set();
    const byStatus = {
        PROVEN: 0,
        IMPLEMENTED: 0,
        PARTIALLY_IMPLEMENTED: 0,
        PROTOTYPED: 0,
        THEORETICAL: 0,
        RESEARCH_REQUIRED: 0,
        UNSUPPORTED: 0,
        REFUTED: 0,
    };
    const unsupported = [];
    const illegalTransitions = [];
    if (registry.schema !== 'gspl.claims') {
        errors.push({ code: 'BAD_SCHEMA', message: 'claims schema must be gspl.claims' });
    }
    for (const c of registry.claims) {
        if (!isClaimId(c.claimId)) {
            errors.push({ code: 'BAD_CLAIM_ID', message: 'claim id must match GSPL-CLAIM-NNNN: ' + c.claimId, ids: [c.claimId] });
        }
        if (seen.has(c.claimId)) {
            errors.push({ code: 'DUPLICATE_CLAIM_ID', message: 'claim id duplicated: ' + c.claimId, ids: [c.claimId] });
        }
        seen.add(c.claimId);
        if (!c.statement || c.statement.length < 5) {
            errors.push({ code: 'EMPTY_STATEMENT', message: 'claim statement empty or trivial', ids: [c.claimId] });
        }
        if (!c.scope || c.scope.length < 3) {
            warnings.push({ code: 'EMPTY_SCOPE', message: 'claim scope empty', ids: [c.claimId] });
        }
        if (!c.conditions || c.conditions.length === 0) {
            warnings.push({ code: 'EMPTY_CONDITIONS', message: 'claim conditions empty', ids: [c.claimId] });
        }
        if (!c.verificationMethod || c.verificationMethod.length < 3) {
            warnings.push({ code: 'EMPTY_VERIFICATION', message: 'claim verificationMethod empty', ids: [c.claimId] });
        }
        if (!c.lastReviewed || !/^\d{4}-\d{2}-\d{2}/.test(c.lastReviewed)) {
            warnings.push({ code: 'BAD_LAST_REVIEWED', message: 'claim lastReviewed should be ISO date', ids: [c.claimId] });
        }
        if (!c.relatedInventions || c.relatedInventions.length === 0) {
            warnings.push({ code: 'EMPTY_RELATIONS', message: 'claim relatedInventions empty', ids: [c.claimId] });
        }
        if (!(c.status in STATUS_RANK)) {
            errors.push({ code: 'BAD_STATUS', message: 'claim status invalid: ' + c.status, ids: [c.claimId] });
        }
        else {
            byStatus[c.status] += 1;
        }
        if (REQUIRES_EVIDENCE.has(c.status) && (c.evidence?.length ?? 0) === 0) {
            errors.push({ code: 'MISSING_EVIDENCE', message: 'claim ' + c.status + ' requires at least 1 evidence reference', ids: [c.claimId] });
            unsupported.push(c.claimId);
        }
        if ((c.status === 'PROTOTYPED' || c.status === 'PARTIALLY_IMPLEMENTED' || c.status === 'IMPLEMENTED' || c.status === 'PROVEN') && (c.falsificationCriteria?.length ?? 0) === 0) {
            errors.push({ code: 'MISSING_FALSIFICATION', message: 'claim at ' + c.status + ' requires falsification criteria', ids: [c.claimId] });
        }
        if ((c.status === 'REFUTED' || c.status === 'UNSUPPORTED') && (c.evidence?.length ?? 0) === 0 && (c.counterEvidence?.length ?? 0) === 0) {
            warnings.push({ code: 'REFUTED_WITHOUT_COUNTER', message: 'REFUTED without counterEvidence or evidence references', ids: [c.claimId] });
        }
        if (c.evidence) {
            for (const e of c.evidence) {
                if (!e.repo || !e.file) {
                    errors.push({ code: 'EMPTY_EVIDENCE_REF', message: 'claim cites empty evidence reference', ids: [c.claimId] });
                }
            }
        }
        if (c.counterEvidence) {
            for (const e of c.counterEvidence) {
                if (!e.repo || !e.file) {
                    warnings.push({ code: 'EMPTY_COUNTER_REF', message: 'claim cites empty counter-evidence reference', ids: [c.claimId] });
                }
            }
        }
    }
    if (options.expectedSteps) {
        for (const step of options.expectedSteps) {
            if (isLadderSkip(step.from, step.to)) {
                illegalTransitions.push({ claimId: 'multistep', from: step.from, to: step.to, since: step.since });
            }
        }
    }
    errors.sort((a, b) => ((a.code + (a.ids?.[0] ?? '')) < (b.code + (b.ids?.[0] ?? '')) ? -1 : 1));
    warnings.sort((a, b) => ((a.code + (a.ids?.[0] ?? '')) < (b.code + (b.ids?.[0] ?? '')) ? -1 : 1));
    unsupported.sort();
    return {
        schema: 'gspl.claims-report',
        schemaVersion: '1.0',
        generatedAt: new Date().toISOString(),
        ok: errors.length === 0,
        errors,
        warnings,
        summary: {
            claimsChecked: registry.claims.length,
            byStatus,
            illegalTransitions,
            unsupportedClaims: unsupported,
        },
    };
}
//# sourceMappingURL=classifier.js.map