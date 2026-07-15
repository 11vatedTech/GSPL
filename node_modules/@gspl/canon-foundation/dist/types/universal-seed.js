/**
 * UniversalSeed — the canonical type per spec/01.
 *
 * Per `packages/canon-foundation/test/canon-foundation.test.ts`, the type
 * must contain at minimum:
 *  - $gst
 *  - $domain
 *  - $lineage
 *  - genes
 *
 * And may contain optional:
 *  - $name
 *  - $metadata
 *  - $hash (excluded from canonicalization material)
 *
 * The `makePrimordialDraft` factory packages the most common construction.
 */
/**
 * Construct a primordial UniversalSeed.
 *
 * A primordial seed has empty `parents`, `generation: 0`, and operation
 * `'primordial'`. Useful for tests and for tooling that produces fresh
 * top-level seeds from components.
 */
export function makePrimordialDraft(domain, genes, options) {
    const seed = {
        $gst: '1.0',
        $domain: domain,
        $lineage: {
            operation: 'primordial',
            parents: [],
            generation: 0,
        },
        genes: genes,
    };
    if (options?.name !== undefined)
        seed.$name = options.name;
    if (options?.metadata !== undefined)
        seed.$metadata = options.metadata;
    return seed;
}
//# sourceMappingURL=universal-seed.js.map