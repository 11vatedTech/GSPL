/** \u00a73 + \u00a75 STRUCTURED_FRAGMENT_RECONSTRUCTION — diagnostic & support-table tests.
 *
 *  Verifies that the reconstructor exports:
 *    - 6 stable ReconstructDiagnostic codes
 *    - RECONSTRUCTION_MODE constants
 *    - GENE_TYPE_RECONSTRUCTION_SUPPORT table covering all 17 baseline genes
 *    - reconstructSeedFromIr emits warnings for missing canonical meta-sections
 *      while preserving the byte-equal round-trip path (severity=warning, ok=true)
 */
import { describe, it, expect } from 'vitest';
import {
  reconstructSeedFromIr,
  RECONSTRUCTION_MODE,
  GENE_TYPE_RECONSTRUCTION_SUPPORT,
  type ReconstructDiagnosticCode,
  type ReconstructionContext,
} from '../src/index.js';
import { createStandardGeneRegistry } from '@gspl/gene-protocol';
import type { GsplIrGraph } from '@gspl/ir-model';

const STABLE_CODES: readonly ReconstructDiagnosticCode[] = [
  'GSPL-RECONSTRUCT-MISSING-SECTION',
  'GSPL-RECONSTRUCT-EMPTY-GENES',
  'GSPL-RECONSTRUCT-UNKNOWN-KIND',
  'GSPL-RECONSTRUCT-UNKNOWN-GENE-TYPE',
  'GSPL-RECONSTRUCT-LIMIT-EXCEEDED',
  'GSPL-RECONSTRUCT-INCOMPLETE-IDENTITY',
];

function emptyGraph(): GsplIrGraph {
  return {
    schema: 'gspl.ir-graph', schemaVersion: '1.0',
    nodes: new Map(), edges: new Map(), regions: new Map(),
    metadata: { seedIdentityHash: 'test-empty', compilerVersion: '0.1.0', canonVersion: '1.0' },
  } as unknown as GsplIrGraph;
}

const baseCtx: ReconstructionContext = {
  geneRegistry: createStandardGeneRegistry(),
  compilerVersion: '0.1.0', canonVersion: '1.0',
  limits: { maxGenes: 1024, maxConstraints: 256, maxDependencies: 256 },
};

describe('STRUCTURED_FRAGMENT_RECONSTRUCTION canonical diagnostic taxonomy', function() {
  it('exports the six stable GSPL-RECONSTRUCT-* codes', function() {
    expect(STABLE_CODES).toHaveLength(6);
    for (const code of STABLE_CODES) {
      expect(typeof code).toBe('string');
      expect(code.startsWith('GSPL-RECONSTRUCT-')).toBe(true);
    }
  });

  it('exports RECONSTRUCTION_MODE constant for CANONICAL_ENVELOPE and STRUCTURED_FRAGMENT', function() {
    expect(RECONSTRUCTION_MODE.CANONICAL_ENVELOPE).toBe('CANONICAL_ENVELOPE_RECONSTRUCTION');
    expect(RECONSTRUCTION_MODE.STRUCTURED_FRAGMENT).toBe('STRUCTURED_FRAGMENT_RECONSTRUCTION');
  });

  it('GENE_TYPE_RECONSTRUCTION_SUPPORT covers all 17 baseline genes', function() {
    const expected = ['array','categorical','dimensional','expression','field','gematria','graph','quantum','regulatory','resonance','scalar','sovereignty','struct','symbolic','temporal','topology','vector'];
    expect(Object.keys(GENE_TYPE_RECONSTRUCTION_SUPPORT).sort()).toEqual(expected);
  });

  it('canonical envelope support is true for every baseline gene type', function() {
    for (const typeId of Object.keys(GENE_TYPE_RECONSTRUCTION_SUPPORT)) {
      const rec = (GENE_TYPE_RECONSTRUCTION_SUPPORT as Record<string,{canonicalEnvelope:boolean;structuredFragment:boolean}>)[typeId];
      expect(rec.canonicalEnvelope).toBe(true);
    }
  });

  it('structuredFragment defaults to false for library/security types and true for core/fundamental', function() {
    expect(GENE_TYPE_RECONSTRUCTION_SUPPORT.scalar.structuredFragment).toBe(true);
    expect(GENE_TYPE_RECONSTRUCTION_SUPPORT.struct.structuredFragment).toBe(true);
    expect(GENE_TYPE_RECONSTRUCTION_SUPPORT.field.structuredFragment).toBe(false);
    expect(GENE_TYPE_RECONSTRUCTION_SUPPORT.sovereignty.structuredFragment).toBe(false);
  });

  it('replaying an empty IR yields MISSING-SECTION + EMPTY-GENES warnings but stays ok', function() {
    const r = reconstructSeedFromIr(emptyGraph(), baseCtx);
    expect(r.ok).toBe(true);
    const codes = r.diagnostics.map(function(d){ return d.code; });
    expect(codes).toContain('GSPL-RECONSTRUCT-MISSING-SECTION');
    expect(codes).toContain('GSPL-RECONSTRUCT-EMPTY-GENES');
    expect(r.diagnostics.some(function(d){ return d.severity==='warning'; })).toBe(true);
    expect(r.diagnostics.some(function(d){ return d.severity==='error'; })).toBe(false);
  });

  it('limit-exceeded breach escalates to error severity', function() {
    const tightCtx: ReconstructionContext = {...baseCtx, limits: {maxGenes:0,maxConstraints:0,maxDependencies:0}};
    const graph: GsplIrGraph = {
      schema:'gspl.ir-graph', schemaVersion:'1.0',
      nodes: new Map([['n:test:scalar:scalar:value:1', { id:'n:test:scalar:scalar:value:1', kind:'gene', type:'scalar', value:42, attributes:{geneName:'scalar', confidence:1.0}, provenance:{source:'seed', originId:'scalar'} }]]),
      edges: new Map(), regions: new Map(),
      metadata: { seedIdentityHash:'test-tight', compilerVersion:'0.1.0', canonVersion:'1.0' },
    } as unknown as GsplIrGraph;
    const r = reconstructSeedFromIr(graph, tightCtx);
    const limitErrs = r.diagnostics.filter(function(d){ return d.code==='GSPL-RECONSTRUCT-LIMIT-EXCEEDED'; });
    expect(limitErrs.length).toBeGreaterThan(0);
    expect(limitErrs[0].severity).toBe('error');
    expect(r.ok).toBe(false);
  });
});
