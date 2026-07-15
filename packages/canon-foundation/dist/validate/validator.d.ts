/**
 * The 8 invariants per spec/01 — the structural validity checker for any
 * UniversalSeed.
 *
 * Invariant numbers and meanings (mirrors the test expectations):
 *   1. $hash matches canonical content hash                  (HASH)
 *   2. derivative seeds (operation≠primordial) have ≥1 parent (PARENTS)
 *   3. gene names do not start with '$'                       (NAME_PREFIX)
 *   4. gene type is one of the canonical 17                   (GENE_TYPE)
 *   5. $gst is the locked current version (currently '1.0')   (GST_VERSION)
 *   6. $domain is one of the 26 canonical domains            (DOMAIN)
 *   7. gene values pass per-type basic shape checks          (GENE_SHAPE)
 *   8. $gst is one of the supported values                   (GST_KNOWN)
 *
 * Tests pin specific invariant numbers — DO NOT renumber.
 */
import type { UniversalSeed } from '../types/universal-seed.js';
export type InvariantNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export interface ValidationError {
    invariant: InvariantNumber;
    code: string;
    message: string;
    path?: string;
}
export type ValidationResult = {
    ok: true;
} | {
    ok: false;
    errors: ValidationError[];
};
/**
 * Validate a UniversalSeed against the 8 invariants.
 */
export declare function validateSeed(seed: UniversalSeed): ValidationResult;
//# sourceMappingURL=validator.d.ts.map