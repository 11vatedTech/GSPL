import { describe, it, expect } from 'vitest';
import { checkProvenance } from '../src/validators.js';
import { isInventionId, isArchitectureId, isValidDisposition, isValidTarget, isValidSourceType, isValidClaimStatus } from '../src/ids.js';
import type {
  ArchitectureComparisonRegistry,
  InventionEntry,
  InventionRegistry,
  ProvenanceSource,
  SourceRecord,
  SourceRegistry,
} from '../src/types.js';

function makeInvention(over: Partial<InventionEntry> = {}): InventionEntry {
  return {
    id: 'GSPL-INV-0001',
    canonicalName: 'Genome canonical seed model',
    aliases: ['UniversalSeed'],
    founderIntent: 'A typed Genome is the canonical form of a GSPL seed.',
    definition: 'A typed Genome is the canonical form of a GSPL seed with $gst, $domain, $lineage, genes.',
    problemSolved: 'Programs need a stable, addressable canonical representation.',
    evidence: [{ repo: 'paradigm-reference', file: 'spec/01-universal-seed.md' }],
    implementationStatus: 'spec-only',
    claimStatus: null,
    dependencies: [],
    conflicts: [],
    risks: [],
    disposition: 'ADOPT',
    targetSubsystem: 'kernel',
    createdAtPolicy: 'ADR-0001',
    schemaVersion: '1.0',
    ...over,
  };
}

function makeDecision(id: string, references: string[], evidence: ProvenanceSource[] = [{ repo: 'paradigm-reference', file: 'spec/01-universal-seed.md' }]): ArchitectureComparisonRegistry['decisions'][number] {
  return {
    id,
    subsystem: 'kernel',
    disposition: 'ADOPT',
    rationale: 'Adopt because spec is complete.',
    references,
    evidence,
    confidence: 'HIGH',
  };
}

function makeSource(over: Partial<SourceRecord> = {}): SourceRecord {
  return {
    sourceId: 'S-0001',
    repositoryId: 'paradigm-reference',
    repositoryPath: 'archive://PAradigm-reference-main.zip!/spec/01-universal-seed.md',
    relativePath: 'spec/01-universal-seed.md',
    contentHash: 'sha256:' + 'a'.repeat(64),
    sourceType: 'spec',
    language: 'markdown',
    symbolOrSection: 'top',
    availability: 'archive-only',
    verificationStatus: 'verified',
    notes: 'Spec source for universal seed.',
    ...over,
  };
}

function makeRegistry(inventions: InventionEntry[], decisions = [makeDecision('GSPL-ARCH-0001', [inventions[0]?.id ?? 'GSPL-INV-0001'])], sources: SourceRecord[] = [makeSource()]) {
  return {
    inventions: {
      schema: 'gspl.invention-ledger' as const,
      schemaVersion: '1.0' as const,
      generatedAt: '2026-07-14T00:00:00Z',
      inventions,
    },
    decisions: {
      schema: 'gspl.architecture-decisions' as const,
      schemaVersion: '1.0' as const,
      generatedAt: '2026-07-14T00:00:00Z',
      decisions,
    },
    sources: {
      schema: 'gspl.sources' as const,
      schemaVersion: '1.0' as const,
      generatedAt: '2026-07-14T00:00:00Z',
      sources,
    },
  };
}

describe('ids', () => {
  it('invention ids require GSPL-INV-NNNN', () => {
    expect(isInventionId('GSPL-INV-0001')).toBe(true);
    expect(isInventionId('GSPL-INV-12345')).toBe(true);
    expect(isInventionId('GSPL-INV-123')).toBe(false);
    expect(isInventionId('GSPL-ARCH-0001')).toBe(false);
  });
  it('architecture ids require GSPL-ARCH-NNNN', () => {
    expect(isArchitectureId('GSPL-ARCH-0001')).toBe(true);
    expect(isArchitectureId('GSPL-INV-0001')).toBe(false);
  });
  it('dispositions, targets, source types, claim statuses are gated', () => {
    expect(isValidDisposition('ADOPT')).toBe(true);
    expect(isValidDisposition('XYZ')).toBe(false);
    expect(isValidTarget('kernel')).toBe(true);
    expect(isValidTarget('nope')).toBe(false);
    expect(isValidSourceType('spec')).toBe(true);
    expect(isValidSourceType('weird')).toBe(false);
    expect(isValidClaimStatus('THEORETICAL')).toBe(true);
    expect(isValidClaimStatus('GUESS')).toBe(false);
  });
});

describe('checkProvenance', () => {
  it('passes a minimal registry', () => {
    const reg = makeRegistry([makeInvention()]);
    const r = checkProvenance(reg);
    expect(r.ok).toBe(true);
    expect(r.summary.inventionsChecked).toBe(1);
    expect(r.summary.decisionsChecked).toBe(1);
    expect(r.summary.sourcesChecked).toBe(1);
  });

  it('detects malformed invention id', () => {
    const reg = makeRegistry([makeInvention({ id: 'NOPE' })]);
    const r = checkProvenance(reg);
    expect(r.errors.some((e) => e.code === 'BAD_INVENTION_ID')).toBe(true);
  });

  it('detects duplicate invention ids', () => {
    const reg = makeRegistry([makeInvention({ id: 'GSPL-INV-0001' }), makeInvention({ id: 'GSPL-INV-0001', canonicalName: 'X' })]);
    const r = checkProvenance(reg);
    expect(r.errors.some((e) => e.code === 'DUPLICATE_INVENTION_ID')).toBe(true);
  });

  it('detects missing evidence', () => {
    const reg = makeRegistry([makeInvention({ evidence: [] })]);
    const r = checkProvenance(reg);
    expect(r.errors.some((e) => e.code === 'NO_EVIDENCE')).toBe(true);
  });

  it('detects empty evidence references', () => {
    const reg = makeRegistry([makeInvention({ evidence: [{ repo: '', file: '' }] })]);
    const r = checkProvenance(reg);
    expect(r.errors.some((e) => e.code === 'EMPTY_EVIDENCE')).toBe(true);
  });

  it('detects absolute path leaks in evidence', () => {
    const reg = makeRegistry([makeInvention({ evidence: [{ repo: 'p', file: 'C:/foo/bar.ts' }] })]);
    const r = checkProvenance(reg);
    expect(r.errors.some((e) => e.code === 'ABSOLUTE_PATH')).toBe(true);
    expect(r.summary.absolutePathLeaks.length).toBeGreaterThan(0);
  });

  it('tolerates archive:// URIs in evidence', () => {
    const reg = makeRegistry([makeInvention({ evidence: [{ repo: 'p', file: 'archive://x.zip!/foo/bar.ts' }] })]);
    const r = checkProvenance(reg);
    expect(r.errors.some((e) => e.code === 'ABSOLUTE_PATH')).toBe(false);
    expect(r.warnings.some((w) => w.code === 'ARCHIVE_URI_OK')).toBe(true);
  });

  it('detects schema-version mismatch', () => {
    const reg = makeRegistry([makeInvention({ schemaVersion: '2.0' as '1.0' })]);
    const r = checkProvenance(reg);
    expect(r.errors.some((e) => e.code === 'BAD_SCHEMA_VERSION')).toBe(true);
  });

  it('detects orphan inventions (no decision reference)', () => {
    const reg = makeRegistry([makeInvention()], [makeDecision('GSPL-ARCH-0099', [])]);
    const r = checkProvenance(reg);
    expect(r.summary.orphanedInventions).toContain('GSPL-INV-0001');
  });

  it('detects orphan sources not cited by any invention', () => {
    const reg = makeRegistry(
      [makeInvention()],
      [makeDecision('GSPL-ARCH-0001', ['GSPL-INV-0001'])],
      [makeSource({ sourceId: 'S-0002', repositoryId: 'paradigm-reference', relativePath: 'spec/02-orphan.md' })]
    );
    const r = checkProvenance(reg);
    expect(r.summary.orphanedSources).toContain('S-0002');
  });

  it('detects unresolved conflicts between two live inventions', () => {
    const inv1 = makeInvention({ id: 'GSPL-INV-0001', conflicts: ['GSPL-INV-0002'] });
    const inv2 = makeInvention({ id: 'GSPL-INV-0002', canonicalName: 'Other', disposition: 'ADOPT', conflicts: ['GSPL-INV-0001'] });
    const reg = makeRegistry([inv1, inv2], [makeDecision('GSPL-ARCH-0001', ['GSPL-INV-0001', 'GSPL-INV-0002'])]);
    const r = checkProvenance(reg);
    expect(r.summary.unresolvedConflicts.length).toBe(1);
  });

  it('passes a registry with 100 inventions and remains deterministic', () => {
    const items: InventionEntry[] = [];
    const sources: SourceRecord[] = [];
    for (let i = 1; i <= 100; i++) {
      const id = 'GSPL-INV-' + String(i).padStart(4, '0');
      items.push(makeInvention({
        id,
        canonicalName: 'I-' + i,
        evidence: [{ repo: 'paradigm-reference', file: 'spec/' + String(i).padStart(2, '0') + '.md' }],
      }));
      sources.push(makeSource({
        sourceId: 'S-' + String(i).padStart(4, '0'),
        relativePath: 'spec/' + String(i).padStart(2, '0') + '.md',
      }));
    }
    const decisions = items.map((inv) => makeDecision('GSPL-ARCH-' + inv.id.slice(-4), [inv.id]));
    const reg = makeRegistry(items, decisions, sources);
    const r1 = checkProvenance(reg);
    const r2 = checkProvenance(reg);
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(r1.summary).toEqual(r2.summary);
  });

  it('rejects top-level schema mismatches', () => {
    const reg = makeRegistry([makeInvention()]);
    reg.inventions.schema = 'wrong' as 'gspl.invention-ledger';
    const r = checkProvenance(reg);
    expect(r.errors.some((e) => e.code === 'BAD_SCHEMA')).toBe(true);
  });
});
