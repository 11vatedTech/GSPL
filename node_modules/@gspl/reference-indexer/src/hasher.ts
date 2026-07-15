/**
 * File-content hasher.
 *
 * Computes the SHA-256 of a file with DETERMINISTIC normalization:
 *   - Text-like files: UTF-8 with BOM stripped; CRLF → LF.
 *   - Binary files: pass-through (no normalization).
 *
 * The hash is computed over the normalized content, NOT the raw bytes.
 */

import { createHash } from 'node:crypto';
import { classifyFile } from './policy.js';

export interface HashedResult {
  sha256: string;
  bytes: number;
  lines: number;
}

const utf8Decoder = new TextDecoder('utf-8', { fatal: false });

/**
 * Read a file from disk and hash it deterministically.
 */
export async function hashFile(absPath: string, relPath: string): Promise<HashedResult>;
export async function hashFile(absPath: string, classification: string): Promise<HashedResult>;
export async function hashFile(
  absPath: string,
  classifierInput: string
): Promise<HashedResult> {
  const fs = await import('node:fs/promises');
  const raw = await fs.readFile(absPath);
  const classification =
    typeof classifierInput === 'string' && (classifierInput.startsWith('/') || classifierInput.includes('.'))
      ? classifyFile(classifierInput)
      : (classifierInput as 'source' | 'data' | 'binary');
  const h = createHash('sha256');
  let bytes: number;
  let lines = 0;
  if (classification === 'binary') {
    h.update(raw);
    bytes = raw.length;
  } else {
    // Determine if BOM is present.
    let start = 0;
    if (raw.length >= 3 && raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf) start = 3;
    let text = utf8Decoder.decode(raw.subarray(start));
    // Normalize CRLF → LF.
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const textBuf = new TextEncoder().encode(text);
    h.update(textBuf);
    bytes = textBuf.length;
    // Count lines (best effort).
    if (text.length > 0) {
      lines = text.split('\n').length;
      if (text.endsWith('\n')) lines -= 1;
    }
  }
  return { sha256: h.digest('hex'), bytes, lines };
}
