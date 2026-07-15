/**
 * SourceDocument — immutable source text with deterministic identity and positions.
 * Prompt 3 §2 (three identities), §6, §7, §15.
 */
import { createHash } from 'node:crypto';
import type {
  SourceId,
  SourceSnapshotId,
  SourceContentHash,
  RawByteHash,
  SourcePosition,
  SourceSpan,
  SourceDocumentData,
  EncodingPolicy,
} from './types.js';
import { DEFAULT_ENCODING_POLICY } from './types.js';

/** Identity hash over the logical path only. Format-independent. */
export function computeSourceId(logicalPath: string): SourceId {
  return createHash('sha256').update('source-id\0').update(logicalPath, 'utf8').digest('hex') as SourceId;
}

/** Identity hash over raw bytes. */
export function computeRawByteHash(bytes: Uint8Array): RawByteHash {
  return createHash('sha256').update('raw-bytes\0').update(bytes).digest('hex') as RawByteHash;
}

/** Identity hash over decoded source text. */
export function computeContentHash(text: string): SourceContentHash {
  return createHash('sha256').update('content\0').update(text, 'utf8').digest('hex') as SourceContentHash;
}

/** Snapshot identity — depends on SourceId, raw bytes, decoded text, and encoding policy. */
export function computeSourceSnapshotId(args: {
  sourceId: SourceId;
  rawByteHash: RawByteHash;
  contentHash: SourceContentHash;
  encoding: EncodingPolicy;
}): SourceSnapshotId {
  const h = createHash('sha256');
  h.update('snapshot\0');
  h.update(args.sourceId);
  h.update('\0');
  h.update(args.rawByteHash);
  h.update('\0');
  h.update(args.contentHash);
  h.update('\0');
  h.update(args.encoding.policyVersion);
  return h.digest('hex') as SourceSnapshotId;
}

/** Build the line-start index for O(log n) position queries.
 *  Policy (Prompt 3 §5): LF and CRLF each count as one line break (CRLF is folded);
 *  bare CR is accepted with a portability diagnostic and counts as one break;
 *  U+2028 / U+2029 each count as one line break. */
export function buildLineStarts(text: string): readonly number[] {
  const starts: number[] = [0];
  for (let i = 0; i < text.length; i++) {
    const cp = text.charCodeAt(i);
    if (cp === 0x0a) {
      starts.push(i + 1);
    } else if (cp === 0x0d) {
      // CRLF: count the break at the LF position; bare CR counts here.
      if (i + 1 < text.length && text.charCodeAt(i + 1) === 0x0a) {
        // CRLF: skip the LF so we don't double-count.
        starts.push(i + 2);
        i++;
      } else {
        starts.push(i + 1);
      }
    } else if (cp === 0x2028 || cp === 0x2029) {
      starts.push(i + 1);
    } else if (cp >= 0xd800 && cp <= 0xdbff) {
      i++; // skip surrogate pair
    }
  }
  return starts;
}

/**
 * An immutable source document. Built from logical path, raw bytes, decoded text,
 * and encoding policy. The class is a thin view over SourceDocumentData; it adds
 * position lookup but does not expose mutability.
 */
export class SourceDocument {
  readonly id: SourceId;
  readonly snapshotId: SourceSnapshotId;
  readonly logicalPath: string;
  readonly text: string;
  readonly rawByteHash: RawByteHash;
  readonly contentHash: SourceContentHash;
  readonly encoding: 'utf-8';
  readonly hadBom: boolean;
  readonly byteLength: number;
  private readonly lineStarts: readonly number[];

  constructor(data: SourceDocumentData) {
    this.id = data.id;
    this.snapshotId = data.snapshotId;
    this.logicalPath = data.logicalPath;
    this.text = data.text;
    this.rawByteHash = data.rawByteHash;
    this.contentHash = data.contentHash;
    this.encoding = data.encoding;
    this.hadBom = data.hadBom;
    this.byteLength = data.byteLength;
    this.lineStarts = data.lineStarts;
  }

  static fromParts(args: {
    logicalPath: string;
    rawBytes: Uint8Array;
    text: string;
    hadBom: boolean;
    encoding?: EncodingPolicy;
  }): SourceDocument {
    const encoding = args.encoding ?? DEFAULT_ENCODING_POLICY;
    const sourceId = computeSourceId(args.logicalPath);
    const rawByteHash = computeRawByteHash(args.rawBytes);
    const contentHash = computeContentHash(args.text);
    const snapshotId = computeSourceSnapshotId({ sourceId, rawByteHash, contentHash, encoding });
    const data: SourceDocumentData = {
      id: sourceId,
      snapshotId,
      logicalPath: args.logicalPath,
      rawByteHash,
      contentHash,
      encoding: 'utf-8',
      hadBom: args.hadBom,
      byteLength: args.rawBytes.length,
      textLength: args.text.length,
      text: args.text,
      lineStarts: buildLineStarts(args.text),
    };
    return new SourceDocument(data);
  }

  /** Legacy convenience for tests — same logical path + same text = same snapshot. */
  static create(logicalPath: string, text: string): SourceDocument {
    const rawBytes = new TextEncoder().encode(text);
    return SourceDocument.fromParts({ logicalPath, rawBytes, text, hadBom: false });
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

  /** Reverse lookup: 1-indexed line+column → UTF-16 offset, clamped. */
  offsetAt(line: number, column: number): number {
    if (line < 1) return 0;
    if (line > this.lineStarts.length) return this.text.length;
    const lineStart = this.lineStarts[line - 1]!;
    return Math.min(this.text.length, lineStart + Math.max(0, column - 1));
  }

  span(start: number, end: number): SourceSpan {
    return { sourceId: this.id, start, end };
  }

  /** Text of a 1-indexed line. Empty string if line is out of range. */
  lineText(line: number): string {
    if (line < 1 || line > this.lineStarts.length) return '';
    const start = this.lineStarts[line - 1]!;
    const end = line < this.lineStarts.length ? this.lineStarts[line]! - 1 : this.text.length;
    return this.text.slice(start, end);
  }

  /** Returns the immutable data view of this document. */
  toData(): SourceDocumentData {
    return {
      id: this.id,
      snapshotId: this.snapshotId,
      logicalPath: this.logicalPath,
      rawByteHash: this.rawByteHash,
      contentHash: this.contentHash,
      encoding: this.encoding,
      hadBom: this.hadBom,
      byteLength: this.byteLength,
      textLength: this.text.length,
      text: this.text,
      lineStarts: this.lineStarts,
    };
  }
}
