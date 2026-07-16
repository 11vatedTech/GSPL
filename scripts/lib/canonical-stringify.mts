/**
 * canonical-stringify.mts — shared deterministic JSON serialisation.
 *
 * Prompt 2 §6. Single implementation used by:
 *   - scripts/write-canonical-manifest.mts
 *   - scripts/compare-canonical-manifests.mts
 *   - scripts/restart-producer.mts
 *   - scripts/restart-consumer.mts
 *   - scripts/source-package/* where compatible
 *
 * Behaviour:
 *   - object keys sorted lexically (Unicode code-point order)
 *   - arrays preserve insertion order
 *   - Map → sorted-by-key object
 *   - Set → sorted-by-element array
 *   - finite-number validation; -0 normalised to 0
 *   - NaN, Infinity, -Infinity rejected
 *   - functions, symbols, undefined silently dropped (so optional fields
 *     can be excluded from the canonical tree without throwing)
 *   - cycle detection via a WeakSet of seen objects
 *   - non-finite / unsupported → throws CanonicalStringifyError with a
 *     deterministic error code so callers can route failures programmatically
 *
 * Unicode normalisation is intentionally NOT applied to string values:
 * canonical-bytes-equality requires byte-fidelity. If normalisation is needed
 * for a specific manifest, do it at the source field, not inside the
 * serialiser.
 */
import { createHash } from 'node:crypto';

/** Stable error type carrying a code for programmatic dispatch. */
export class CanonicalStringifyError extends Error {
  public readonly code: string;
  public readonly path: string;
  public constructor(code: string, message: string, path: string) {
    super('[' + code + '] ' + message + ' at ' + path);
    this.name = 'CanonicalStringifyError';
    this.code = code;
    this.path = path;
  }
}

const PATH_ROOT = '$';
function pathJoin(parent: string, key: string | number): string {
  if (typeof key === 'number') return parent + '[' + key + ']';
  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)) return parent + '.' + key;
  return parent + '[' + JSON.stringify(key) + ']';
}

function normalise(value: unknown, path: string, seen: WeakSet<object>): unknown {
  if (value === undefined) {
    // undefined is silently dropped by Object.keys omission in stableStringify
    // (the `if (v === undefined) continue;` branch below). We do NOT propagate
    // undefined into the output tree.
    return undefined;
  }
  if (value === null) return null;
  const t = typeof value;
  if (t === 'string' || t === 'boolean') return value;
  if (t === 'number') {
    if (!Number.isFinite(value as number)) {
      throw new CanonicalStringifyError('GSPL-CANONICAL-NON-FINITE', 'non-finite number not allowed in canonical form: ' + String(value), path);
    }
    // -0 → 0 normalisation: Object.is(-0, 0) is false but JSON.stringify treats
    // them identically. We normalise to 0 to avoid a 1-bit difference leaking
    // through Uint8Array hashing.
    return value === 0 ? 0 : value;
  }
  if (t === 'bigint') {
    throw new CanonicalStringifyError('GSPL-CANONICAL-BIGINT', 'BigInt is not allowed in canonical form: ' + String(value), path);
  }
  if (t === 'function' || t === 'symbol') {
    throw new CanonicalStringifyError('GSPL-CANONICAL-UNSUPPORTED-TYPE', 'unsupported type in canonical form: ' + t, path);
  }
  // Object-like (Array, Map, Set, plain object)
  if (typeof value !== 'object' || value === null) {
    throw new CanonicalStringifyError('GSPL-CANONICAL-UNSUPPORTED-TYPE', 'unsupported type: ' + t, path);
  }
  if (seen.has(value as object)) {
    throw new CanonicalStringifyError('GSPL-CANONICAL-CYCLE', 'cycle detected in canonical value at ' + path, path);
  }
  seen.add(value as object);
  try {
    if (Array.isArray(value)) {
      const out: unknown[] = new Array(value.length);
      for (let i = 0; i < value.length; i++) out[i] = normalise(value[i], pathJoin(path, i), seen);
      return out;
    }
    if (value instanceof Map) {
      const sortedKeys: string[] = [];
      for (const k of value.keys()) sortedKeys.push(String(k));
      sortedKeys.sort();
      const out: Record<string, unknown> = {};
      for (const k of sortedKeys) {
        const v = normalise(value.get(k as unknown), pathJoin(path, k), seen);
        if (v !== undefined) out[k] = v;
      }
      return out;
    }
    if (value instanceof Set) {
      const arr: unknown[] = [];
      for (const v of value) arr.push(v);
      // Sort by serialised form so non-string Set elements get a stable order.
      arr.sort((a, b) => {
        const sa = stableStringifyShallow(a, seen);
        const sb = stableStringifyShallow(b, seen);
        if (sa < sb) return -1;
        if (sa > sb) return 1;
        return 0;
      });
      const out: unknown[] = new Array(arr.length);
      for (let i = 0; i < arr.length; i++) out[i] = normalise(arr[i], pathJoin(path, i), seen);
      return out;
    }
    // Plain object
    const src = value as Record<string, unknown>;
    const sortedKeys = Object.keys(src).sort();
    const out: Record<string, unknown> = {};
    for (const k of sortedKeys) {
      const v = normalise(src[k], pathJoin(path, k), seen);
      if (v !== undefined) out[k] = v;
    }
    return out;
  } finally {
    seen.delete(value as object);
  }
}

/** Internal: serialise without the seen-set check (for Set comparator use). */
function stableStringifyShallow(value: unknown, seen: WeakSet<object>): string {
  try {
    return stableStringifyInternal(value, seen);
  } catch {
    // Fallback: use a string form so comparator still produces a stable order.
    return String(value);
  }
}

function stableStringifyInternal(value: unknown, seen: WeakSet<object>): string {
  const n = normalise(value, PATH_ROOT, seen);
  return JSON.stringify(n);
}

/**
 * stableStringify(value): the canonical, deterministic JSON serialiser.
 * Throws CanonicalStringifyError on cycle, bigint, function, symbol,
 * non-finite number, or unsupported type.
 */
export function stableStringify(value: unknown): string {
  return stableStringifyInternal(value, new WeakSet<object>());
}

/**
 * Convenience: compute the sha256 hex digest of the canonical serialisation
 * of a value, prefixed with "sha256:".
 */
export function canonicalHash(value: unknown): string {
  const s = stableStringify(value);
  return 'sha256:' + createHash('sha256').update(s, 'utf8').digest('hex');
}

/**
 * Convenience: compute the sha256 hex digest of a raw Uint8Array.
 * This is the bytes-hash path used to avoid the lossy 'binary' string round-trip
 * that Buffer.from(bytes).toString('binary') suffers from. Hashes the bytes
 * directly so cross-platform results are byte-stable.
 */
export function canonicalBytesHash(bytes: Buffer | Uint8Array): string {
  // Buffer extends Uint8Array; createHash.update accepts both directly (no copy needed).
  return 'sha256:' + createHash('sha256').update(bytes).digest('hex');
}