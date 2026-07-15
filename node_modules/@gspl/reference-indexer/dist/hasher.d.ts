/**
 * File-content hasher.
 *
 * Computes the SHA-256 of a file with DETERMINISTIC normalization:
 *   - Text-like files: UTF-8 with BOM stripped; CRLF → LF.
 *   - Binary files: pass-through (no normalization).
 *
 * The hash is computed over the normalized content, NOT the raw bytes.
 */
export interface HashedResult {
    sha256: string;
    bytes: number;
    lines: number;
}
/**
 * Read a file from disk and hash it deterministically.
 */
export declare function hashFile(absPath: string, relPath: string): Promise<HashedResult>;
export declare function hashFile(absPath: string, classification: string): Promise<HashedResult>;
//# sourceMappingURL=hasher.d.ts.map