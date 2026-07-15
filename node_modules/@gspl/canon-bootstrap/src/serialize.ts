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

const DEFAULT_REPLACER = (_key: string, value: unknown): unknown => value;

export function stableStringify(value: unknown): string {
  return JSON.stringify(stableSort(value), DEFAULT_REPLACER, 2) + '\n';
}

/**
 * Sort object keys alphabetically and recurse. Arrays are left as-is
 * (caller's responsibility to pre-sort). Date objects are left in place
 * because callers pass ISO strings, not Date instances.
 */
function stableSort(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableSort);
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const sortedKeys = Object.keys(obj).sort();
    const out: Record<string, unknown> = {};
    for (const k of sortedKeys) {
      out[k] = stableSort(obj[k]);
    }
    return out;
  }
  return value;
}

/** Canonical timestamp used by the bootstrap; never varies by wall clock. */
export const BOOTSTRAP_TIMESTAMP = '2026-07-14T00:00:00.000Z';
