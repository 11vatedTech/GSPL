/**
 * Canonical Serialization refinements — Prompt 2 §13
 *
 * Extends the JCS-based canonicalization with GSPL-specific constraints:
 *   - Unicode normalization (NFKC)
 *   - Negative zero normalized to positive zero
 *   - NaN/Infinity policy (rejected by default, allowed in tagged contexts)
 *   - Binary data encoding (base64url)
 *   - Timestamp normalization (ISO 8601, UTC)
 *   - URI normalization
 *   - Large integer handling
 */
/** Unicode normalization form for canonical strings */
export declare const CANONICAL_UNICODE_FORM: 'NFKC';
/** Normalize a string to canonical Unicode form */
export declare function normalizeUnicode(s: string): string;
/** Normalize a number for canonical output */
export declare function normalizeNumber(n: number): number;
/** Round-trip stable: is this number safe for canonical representation? */
export declare function isCanonicalNumber(n: number): boolean;
/**
 * Encode binary data as canonical base64url (no padding).
 * This is the GSPL canonical binary encoding.
 */
export declare function encodeBinary(data: Uint8Array): string;
/** Decode canonical base64url back to bytes */
export declare function decodeBinary(encoded: string): Uint8Array;
/**
 * Round-trip binary encoding: encode → decode produces original bytes.
 */
export declare function binaryRoundTrip(data: Uint8Array): boolean;
/**
 * Normalize a timestamp to canonical ISO 8601 UTC form.
 * Strips milliseconds if they are zero.
 */
export declare function normalizeTimestamp(ts: string): string;
export declare function serializeCanonicalNumber(n: number): string;
//# sourceMappingURL=serialization.d.ts.map