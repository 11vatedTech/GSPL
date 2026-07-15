/** Reproducibility contract per Prompt 2 §5.2-5.3 */
export const OUTPUT_EQUIVALENCE_LEVELS = [
    'BYTE_IDENTICAL',
    'STRUCTURALLY_IDENTICAL',
    'SEMANTICALLY_EQUIVALENT',
    'BEHAVIORALLY_EQUIVALENT',
    'ARCHITECTURALLY_EQUIVALENT',
    'OBSERVATIONALLY_EQUIVALENT',
    'APPROXIMATE',
    'NOT_EQUIVALENT',
];
const EQUIVALENCE_ORDER = {
    BYTE_IDENTICAL: 0,
    STRUCTURALLY_IDENTICAL: 1,
    SEMANTICALLY_EQUIVALENT: 2,
    BEHAVIORALLY_EQUIVALENT: 3,
    ARCHITECTURALLY_EQUIVALENT: 4,
    OBSERVATIONALLY_EQUIVALENT: 5,
    APPROXIMATE: 6,
    NOT_EQUIVALENT: 7,
};
/** Compare equivalence: returns true if a is AT LEAST as strong as b */
export function compareEquivalence(a, b) {
    return (EQUIVALENCE_ORDER[a] ?? 7) <= (EQUIVALENCE_ORDER[b] ?? 7);
}
//# sourceMappingURL=reproducibility.js.map