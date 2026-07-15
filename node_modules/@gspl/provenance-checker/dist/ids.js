/**
 * ID validation for canonical inventions, decisions, sources, and 8 status taxonomy.
 *
 * Locked canonical id formats:
 *   - Inventions:       GSPL-INV-NNNN
 *   - Architecture:     GSPL-ARCH-NNNN
 *   - Claims:           GSPL-CLAIM-NNNN
 *   - Sources:          S-NNNN
 *   - Provenance:       gspl.provenance-report@<sha256-prefix>
 */
const INVENTION_ID_REGEX = /^GSPL-INV-(\d{4,})$/;
const ARCH_ID_REGEX = /^GSPL-ARCH-(\d{4,})$/;
const CLAIM_ID_REGEX = /^GSPL-CLAIM-(\d{4,})$/;
const SOURCE_ID_REGEX = /^S-(\d{4,})$/;
export function isInventionId(id) {
    return INVENTION_ID_REGEX.test(id);
}
export function inventionNumber(id) {
    const m = id.match(INVENTION_ID_REGEX);
    return m ? parseInt(m[1], 10) : null;
}
export function isArchitectureId(id) {
    return ARCH_ID_REGEX.test(id);
}
export function archNumber(id) {
    const m = id.match(ARCH_ID_REGEX);
    return m ? parseInt(m[1], 10) : null;
}
export function isClaimId(id) {
    return CLAIM_ID_REGEX.test(id);
}
export function isSourceId(id) {
    return SOURCE_ID_REGEX.test(id);
}
const VALID_DISPOSITIONS = new Set(['ADOPT', 'ADAPT', 'REWRITE', 'RESEARCH', 'ARCHIVE', 'REJECT']);
export function isValidDisposition(s) {
    return VALID_DISPOSITIONS.has(s);
}
const VALID_CONFIDENCES = new Set(['HIGH', 'MEDIUM', 'LOW']);
export function isValidConfidence(s) {
    return VALID_CONFIDENCES.has(s);
}
const VALID_TARGETS = new Set([
    'kernel',
    'gene-system',
    'language',
    'compiler',
    'runtime',
    'interoperability',
    'translation-bridge',
    'package-system',
    'canon-governance',
]);
export function isValidTarget(s) {
    return VALID_TARGETS.has(s);
}
const VALID_CLAIM_STATUSES = new Set([
    'PROVEN',
    'IMPLEMENTED',
    'PARTIALLY_IMPLEMENTED',
    'PROTOTYPED',
    'THEORETICAL',
    'RESEARCH_REQUIRED',
    'UNSUPPORTED',
    'REFUTED',
]);
export function isValidClaimStatus(s) {
    return VALID_CLAIM_STATUSES.has(s);
}
const VALID_SOURCE_TYPES = new Set(['spec', 'code', 'doc', 'test', 'archive']);
export function isValidSourceType(s) {
    return VALID_SOURCE_TYPES.has(s);
}
//# sourceMappingURL=ids.js.map