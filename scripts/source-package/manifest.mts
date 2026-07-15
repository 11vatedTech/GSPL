/** manifest.mts — deterministic source-archive-manifest JSON emitter.
 *  Schema per Prompt 2 §2. No wall-clock, no absolute paths. */
import { createHash } from 'node:crypto';
import type { ManifestEntry } from './collect.mts';

export interface SourceArchiveManifest {
  readonly schema: 'gspl.source-archive-manifest';
  readonly schemaVersion: '1.0';
  readonly repositoryVersion: string;
  readonly sourceCommit: string;
  readonly entries: readonly ManifestEntry[];
  readonly totalFiles: number;
  readonly totalBytes: number;
  readonly manifestHash: string;
}

export function buildManifest(
  entries: readonly ManifestEntry[],
  tarHash: string,
  repositoryVersion: string,
  sourceCommit: string,
): SourceArchiveManifest {
  return {
    schema: 'gspl.source-archive-manifest',
    schemaVersion: '1.0',
    repositoryVersion,
    sourceCommit,
    entries,
    totalFiles: entries.length,
    totalBytes: entries.reduce((s, e) => s + e.size, 0),
    manifestHash: tarHash,
  };
}

export function serializeManifest(m: SourceArchiveManifest): Buffer {
  return Buffer.from(JSON.stringify(m, null, 2), 'utf8');
}

export function hashManifest(m: SourceArchiveManifest): string {
  return 'sha256:' + createHash('sha256').update(serializeManifest(m)).digest('hex');
}
