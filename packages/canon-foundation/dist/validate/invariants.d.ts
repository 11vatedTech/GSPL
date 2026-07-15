/**
 * 7+1-Axis Discipline invariants per spec/01 + MVP_DEFINITION.md Part 7.
 *
 * The seven axes (signed, typed, lineage-tracked, graph-structured,
 * confidence-bearing, rollback-able, differentiable) are a STRUCTURAL
 * CONTRACT. Every gseed, CLI, editor, and export surface must satisfy all
 * seven. They are NOT a registry of concepts; they are dimensions of a
 * contract that all surfaces comply with.
 *
 * Test pins:
 *   - SEVEN_AXES.length === 7 and equals the order in const SEVEN_AXES.
 *   - For an unsigned primordial draft:
 *       signed              : present === false
 *       differentiable      : present === true
 *       missing             includes 'signed', 'lineage-tracked', 'confidence-bearing'
 *   - Each axis carries non-empty `evidence`.
 */
import type { UniversalSeed } from '../types/universal-seed.js';
import type { SevenAxisId } from '../constants.js';
export declare const SEVEN_AXES_COUNT: number;
export type AxisEvidence = {
    path: string;
    present: boolean;
    note: string;
};
export type AxisReport = {
    axis: SevenAxisId;
    present: boolean;
    evidence: AxisEvidence[];
};
export type SevenAxisReport = {
    axes: AxisReport[];
    allPresent: boolean;
    missing: SevenAxisId[];
};
/**
 * Compute the per-axis report for a seed.
 */
export declare function checkSevenAxes(seed: UniversalSeed): SevenAxisReport;
//# sourceMappingURL=invariants.d.ts.map