import { describe, it, expect } from 'vitest';
import { INVENTIONS } from '../src/inventions/index.js';
import { SOURCES } from '../src/sources/index.js';
import { CLAIMS } from '../src/claims/index.js';
import {
  writeAllRegistries,
  writeInventionRegistry,
  writeSourceRegistry,
  writeClaimRegistry
} from '../src/registry.js';
import { writeInventionLedger, writeProvenanceRegistry, writeClaimsRegister } from '../src/ledgers.js';
import { checkLedgersVsJson } from '../src/consistency.js';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rmSync } from 'node:fs';

describe('inventions registry', () => {
  it('contains exactly 20 entries GSPL-INV-0001..0020', () => {
    expect(INVENTIONS.length).toBe(20);
    const ids = new Set(INVENTIONS.map((i) => i.id));
    for (let n = 1; n <= 20; n++) {
      const id = 'GSPL-INV-' + String(n).padStart(4, '0');
      expect(ids.has(id)).toBe(true);
    }
  });
  it('every invention has a non-empty canonicalName, definition, founderIntent, evidence, schemaVersion=1.0', () => {
    for (const i of INVENTIONS) {
      expect(i.canonicalName.length).toBeGreaterThan(2);
      expect(i.definition.length).toBeGreaterThanOrEqual(5);
      expect(i.founderIntent.length).toBeGreaterThanOrEqual(5);
      expect(i.evidence.length).toBeGreaterThan(0);
      expect(i.schemaVersion).toBe('1.0');
    }
  });
  it('all invention ids are sorted when emitted', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cb-'));
    try {
      const p = join(dir, 'inv.json');
      writeInventionRegistry(p);
      const j = JSON.parse(await readFile(p, 'utf-8'));
      const ids = j.inventions.map((x: any) => x.id);
      const sorted = [...ids].sort();
      expect(ids).toEqual(sorted);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('sources registry', () => {
  it('contains 30 source records covering 6 reference repos + canon-foundation', () => {
    expect(SOURCES.length).toBe(30);
    const ids = new Set(SOURCES.map((s) => s.repositoryId));
    expect(ids.has('paradigm-reference')).toBe(true);
    expect(ids.has('paradigm-gspl-os')).toBe(true);
    expect(ids.has('paradigm-main')).toBe(true);
    expect(ids.has('generative-seed-gspl')).toBe(true);
    expect(ids.has('gspl-paradigm')).toBe(true);
    expect(ids.has('paradigm-goe-ai')).toBe(true);
    expect(ids.has('canon-foundation')).toBe(true);
  });
});

describe('claims registry', () => {
  it('contains exactly 12 entries GSPL-CLAIM-0001..0012', () => {
    expect(CLAIMS.length).toBe(12);
    const statuses = new Set(CLAIMS.map((c) => c.status));
    expect(statuses.has('REFUTED')).toBe(true);
    expect(statuses.has('REFUTED') && CLAIMS.filter((c) => c.status === 'REFUTED').length).toBeGreaterThanOrEqual(2);
    expect(CLAIMS.some((c) => c.status === 'RESEARCH_REQUIRED')).toBe(true);
    expect(CLAIMS.some((c) => c.status === 'THEORETICAL')).toBe(true);
    expect(CLAIMS.some((c) => c.status === 'PROTOTYPED')).toBe(true);
    expect(CLAIMS.some((c) => c.status === 'IMPLEMENTED')).toBe(true);
    expect(CLAIMS.some((c) => c.status === 'PARTIALLY_IMPLEMENTED')).toBe(true);
  });
  it('claim with status above THEORETICAL has evidence, falsificationCriteria, and at least one relatedInvention', () => {
    const high = CLAIMS.filter((c) => ['PROVEN', 'IMPLEMENTED', 'PARTIALLY_IMPLEMENTED', 'PROTOTYPED'].includes(c.status));
    expect(high.length).toBeGreaterThan(0);
    for (const c of high) {
      expect(c.evidence.length).toBeGreaterThan(0);
      expect(c.falsificationCriteria.length).toBeGreaterThan(0);
      expect(c.relatedInventions.length).toBeGreaterThan(0);
    }
  });
  it('does not falsely claim reference-indexer is IMPLEMENTED without end-to-end execution', () => {
    const idx = CLAIMS.filter((c) => c.statement.toLowerCase().includes('reference indexer') || c.statement.toLowerCase().includes('indexer'));
    if (idx.length > 0) {
      for (const c of idx) {
        expect(['PROVEN', 'IMPLEMENTED']).not.toContain(c.status);
      }
    }
  });
});

describe('determinism', () => {
  it('running the writer twice produces byte-identical files', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cb-'));
    try {
      const inv = join(dir, 'inv.json');
      const src = join(dir, 'src.json');
      const cla = join(dir, 'cla.json');
      writeAllRegistries({ inventionsPath: inv, sourcesPath: src, claimsPath: cla });
      const before = {
        inv: await readFile(inv, 'utf-8'),
        src: await readFile(src, 'utf-8'),
        cla: await readFile(cla, 'utf-8')
      };
      writeAllRegistries({ inventionsPath: inv, sourcesPath: src, claimsPath: cla });
      const after = {
        inv: await readFile(inv, 'utf-8'),
        src: await readFile(src, 'utf-8'),
        cla: await readFile(cla, 'utf-8')
      };
      expect(after.inv).toBe(before.inv);
      expect(after.src).toBe(before.src);
      expect(after.cla).toBe(before.cla);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('consistency', () => {
  it('MD-ledger IDs match JSON IDs and byte-equality holds round-trip', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cb-'));
    try {
      const paths = {
        inventionsPath: join(dir, 'inv.json'),
        sourcesPath: join(dir, 'src.json'),
        claimsPath: join(dir, 'cla.json'),
        inventionsJson: join(dir, 'inv.json'),
        sourcesJson: join(dir, 'src.json'),
        claimsJson: join(dir, 'cla.json'),
        inventionLedger: join(dir, 'invs.md'),
        provenanceRegistry: join(dir, 'prov.md'),
        claimsRegister: join(dir, 'claims.md')
      };
      writeAllRegistries(paths);
      writeInventionLedger(paths.inventionLedger);
      writeProvenanceRegistry(paths.provenanceRegistry);
      writeClaimsRegister(paths.claimsRegister);
      const r = checkLedgersVsJson(paths);
      expect(r.ok).toBe(true);
      expect(r.mismatches).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('archive:// URIs', () => {
  it('source records tolerate archive:// notation without absolute-path-leak errors', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cb-'));
    try {
      const p = join(dir, 'src.json');
      writeSourceRegistry(p);
      const j = JSON.parse(await readFile(p, 'utf-8'));
      const archiveUris = j.sources.filter((s: any) => s.repositoryPath.includes('archive://') || s.relativePath.includes('archive://'));
      expect(archiveUris.length).toBeGreaterThan(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
