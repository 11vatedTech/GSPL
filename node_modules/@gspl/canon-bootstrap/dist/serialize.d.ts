/**
 * Deterministic JSON serialization.
 *
 * Goal: same in-memory data → byte-identical file output across OS, time,
 * and env. No timestamps, no machine-specific ordering.
 *
 * Properties:
 *  - Sorted keys (fixed key order per object shape).
 *  - Indent of 2 spaces.
 *  - Trailing newline.
 *  - Stable ordering of array entries by their declared id where present.
 *
 * NOTE: For full determinism, callers MUST pre-sort arrays before passing
 * them in. The bootstrap does so explicitly. This serializer additionally
 * sorts object keys alphabetically.
 */
export declare function stableStringify(value: unknown): string;
/** Canonical timestamp used by the bootstrap; never varies by wall clock. */
export declare const BOOTSTRAP_TIMESTAMP = "2026-07-14T00:00:00.000Z";
//# sourceMappingURL=serialize.d.ts.map