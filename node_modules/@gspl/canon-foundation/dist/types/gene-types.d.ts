/**
 * The 17 Gene Types — INITIAL INVENTORY per spec/02.
 *
 * Per `packages/canon-foundation/test/canon-foundation.test.ts`, the registry
 * must expose a non-empty entry for each of the 17 types, and `sovereignty`
 * must have `mutationAllowed=false` and `crossoverAllowed=false`.
 *
 * This registry is EXTENSIBLE per the EXTENSIBILITY PROTOCOL in
 * `docs/canon/GSPL_FIRST_PRINCIPLES.md` and `constants.ts`. New gene types
 * require an Invention entry, a GID document, and an ADR.
 */
import { GENE_TYPES } from '../constants.js';
/** Total canonical gene-type count. */
export declare const GENE_TYPES_COUNT: number;
export interface GeneTypeDescriptor {
    readonly id: (typeof GENE_TYPES)[number];
    /** Whether the operator `mutate` may be applied to genes of this type. */
    readonly mutationAllowed: boolean;
    /** Whether the operator `crossover` may be applied to genes of this type. */
    readonly crossoverAllowed: boolean;
    /** Short human description. */
    readonly description: string;
}
/**
 * Authoritative registry. Order follows the canonical ordering in `GENE_TYPES`.
 */
export declare const GENE_TYPE_REGISTRY: Readonly<Record<(typeof GENE_TYPES)[number], GeneTypeDescriptor>>;
/** Returns true iff `id` is one of the canonical 17 gene types. */
export declare function isCanonicalGeneType(id: string): id is (typeof GENE_TYPES)[number];
//# sourceMappingURL=gene-types.d.ts.map