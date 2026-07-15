/** Structured diagnostics and provenance — Prompt 2 §11 */
/** Build a provenance chain for a given source */
export function provenanceChain(source, originId, transformation) {
    return { source, originId, transformation };
}
/** Default provenance when no better source exists */
export function defaultProvenance() {
    return { source: 'default', originId: 'gspl-compiler' };
}
/** Create a diagnostic */
export function diagnostic(code, severity, category, message, overrides) {
    return { code, severity, category, message, ...overrides };
}
//# sourceMappingURL=diagnostics.js.map