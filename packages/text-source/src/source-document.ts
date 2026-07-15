/**
 * SourceDocument — immutable source text with deterministic identity and positions.
 * Prompt 3 §6 (source positions), §7 (Unicode/security), §15 (source loader).
 */
import { createHash } from 'node:crypto';
import type { SourceId, SourcePosition, SourceSpan } from './types.js';

/**
 * Compute a deterministic SourceId from a logical path and source text.
 * The hash is sha256(normalize(path) + '\0' + text). Physical filesystem
 * paths must be normalized to logical form by the caller before this.
 */
export function computeSourceId(logicalPath: string, text: string): SourceId {
  const h = createHash('sha256');
  h.update(logicalPath);
  h.update('\0');
  h.update(text, 'utf8');
  return h.digest('hex') as SourceId;
}

/**
 * A loaded source document. Immutable. Owns its text and a precomputed
 * line-start index for O(log n) position queries.
 */
export class SourceDocument {
  readonly id: SourceId;
  readonly logicalPath: string;
  readonly text: string;
  private readonly lineStarts: readonly number[];

  constructor(id: SourceId, logicalPath: string, text: string) {
    this.id = id;
    this.logicalPath = logicalPath;
    this.text = text;
    const starts: number[] = [0];
    for (let i = 0; i < text.length; i++) {
      if (text.charCodeAt(i) === 10 /* \n */) starts.push(i + 1);
    }
    this.lineStarts = starts;
  }

  static create(logicalPath: string, text: string): SourceDocument {
    return new SourceDocument(computeSourceId(logicalPath, text), logicalPath, text);
  }

  get length(): number {
    return this.text.length;
  }

  get lineCount(): number {
    return this.lineStarts.length;
  }

  /** Map a 0-indexed offset (UTF-16 code units) to a 1-indexed line + 1-indexed column. */
  positionAt(offset: number): SourcePosition {
    const clamped = Math.max(0, Math.min(offset, this.text.length));
    // Binary search for the greatest lineStart <= clamped.
    let lo = 0;
    let hi = this.lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >>> 1;
      if (this.lineStarts[mid]! <= clamped) lo = mid;
      else hi = mid - 1;
    }
    const line = lo + 1;
    const column = clamped - this.lineStarts[lo]! + 1;
    return { offset: clamped, line, column };
  }

  span(start: number, end: number): SourceSpan {
    return { sourceId: this.id, start, end };
  }
}
