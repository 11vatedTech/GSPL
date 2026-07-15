import { describe, it, expect } from 'vitest';
import {
  createIrGraph,
  addNode,
  addEdge,
  addRegion,
  normalizeGraph,
  computeGraphHash,
  validateGraphStructure,
} from '../src/index.js';
import {
  DEFAULT_EFFECT_PERMISSIONS,
  STANDARD_EFFECTS,
} from '../src/constraints.js';
import type { GsplIrNode, GsplIrGraph } from '../src/index.js';

describe('IR Model — graph construction', () => {
  function metadata() {
    return {
      seedIdentityHash: 'test-hash',
      compilerVersion: '0.1.0',
      canonVersion: '1.0',
      generatedAt: new Date().toISOString(),
    };
  }

  function makeNode(id: string, kind: string): GsplIrNode {
    return {
      id,
      kind: kind as any,
      type: 'test',
      value: null,
      attributes: {},
      provenance: { source: 'compiler', originId: 'test' },
    };
  }

  it('creates an empty graph with root region', () => {
    const g = createIrGraph(metadata());
    expect(g.schema).toBe('gspl.ir-graph');
    expect(g.rootRegion).toBe('region:root');
    expect(g.nodes.size).toBe(0);
    expect(g.edges.size).toBe(0);
    expect(g.regions.size).toBe(1);
  });

  it('adds nodes', () => {
    const g = createIrGraph(metadata());
    addNode(g, makeNode('n1', 'value'));
    addNode(g, makeNode('n2', 'gene'));
    expect(g.nodes.size).toBe(2);
    expect(g.nodes.has('n1')).toBe(true);
    expect(g.nodes.has('n2')).toBe(true);
  });

  it('throws on duplicate node', () => {
    const g = createIrGraph(metadata());
    addNode(g, makeNode('n1', 'value'));
    expect(() => addNode(g, makeNode('n1', 'value'))).toThrow('Duplicate node');
  });

  it('adds edges between existing nodes', () => {
    const g = createIrGraph(metadata());
    addNode(g, makeNode('n1', 'value'));
    addNode(g, makeNode('n2', 'gene'));
    addEdge(g, {
      id: 'e1',
      kind: 'depends-on',
      from: 'n1',
      to: 'n2',
      attributes: {},
      provenance: { source: 'compiler', originId: 'test' },
    });
    expect(g.edges.size).toBe(1);
  });

  it('throws when edge references unknown nodes', () => {
    const g = createIrGraph(metadata());
    expect(() =>
      addEdge(g, {
        id: 'e1',
        kind: 'depends-on',
        from: 'n1',
        to: 'n2',
        attributes: {},
        provenance: { source: 'compiler', originId: 'test' },
      })
    ).toThrow('unknown nodes');
  });

  it('adds sub-regions', () => {
    const g = createIrGraph(metadata());
    addRegion(g, {
      id: 'r1',
      name: 'architecture',
      nodes: [],
      subRegions: [],
      attributes: {},
      provenance: { source: 'compiler', originId: 'test' },
    });
    expect(g.regions.size).toBe(2);
    expect(g.regions.has('r1')).toBe(true);
  });
});

describe('IR Model — deterministic normalization', () => {
  function metadata() {
    return {
      seedIdentityHash: 'test',
      compilerVersion: '0.1.0',
      canonVersion: '1.0',
      generatedAt: new Date().toISOString(),
    };
  }

  function makeNode(id: string, kind: string, val?: unknown): GsplIrNode {
    return {
      id,
      kind: kind as any,
      type: 'test',
      value: val ?? null,
      attributes: {},
      provenance: { source: 'compiler', originId: 'test' },
    };
  }

  it('normalize produces same hash for identical graphs', () => {
    const g1 = createIrGraph(metadata());
    addNode(g1, makeNode('n1', 'value', 'hello'));
    addNode(g1, makeNode('n2', 'gene', 42));

    const g2 = createIrGraph(metadata());
    addNode(g2, makeNode('n1', 'value', 'hello'));
    addNode(g2, makeNode('n2', 'gene', 42));

    const n1 = normalizeGraph(g1);
    const n2 = normalizeGraph(g2);
    expect(n1.normalizationHash).toBe(n2.normalizationHash);
  });

  it('normalize produces different hash for different graphs', () => {
    const g1 = createIrGraph(metadata());
    addNode(g1, makeNode('n1', 'value', 'hello'));

    const g2 = createIrGraph(metadata());
    addNode(g2, makeNode('n1', 'value', 'world'));

    const n1 = normalizeGraph(g1);
    const n2 = normalizeGraph(g2);
    expect(n1.normalizationHash).not.toBe(n2.normalizationHash);
  });

  it('computeGraphHash is deterministic', () => {
    const g = createIrGraph(metadata());
    addNode(g, makeNode('n1', 'value', 'test'));
    expect(computeGraphHash(g)).toBe(computeGraphHash(g));
  });
});

describe('IR Model — graph validation', () => {
  function metadata() {
    return {
      seedIdentityHash: 'test',
      compilerVersion: '0.1.0',
      canonVersion: '1.0',
      generatedAt: new Date().toISOString(),
    };
  }

  it('validates empty graph', () => {
    const g = createIrGraph(metadata());
    const r = validateGraphStructure(g);
    expect(r.ok).toBe(true);
  });

  it('detects orphan nodes', () => {
    const g = createIrGraph(metadata());
    // Add node to root region's node list directly (bypass addNode)
    g.nodes.set('orphan', {
      id: 'orphan',
      kind: 'value',
      type: 'test',
      value: null,
      attributes: {},
      provenance: { source: 'compiler', originId: 'test' },
    });
    const r = validateGraphStructure(g);
    expect(r.ok).toBe(false);
    expect(r.errors.some(e => e.includes('orphan'))).toBe(true);
  });
});

describe('IR Model — effects model', () => {
  it('all effects default to denied', () => {
    for (const [, permitted] of Object.entries(DEFAULT_EFFECT_PERMISSIONS)) {
      expect(permitted).toBe(false);
    }
  });

  it('has 11 standard effect declarations', () => {
    expect(STANDARD_EFFECTS.length).toBe(11);
  });

  it('all standard effects default to not permitted', () => {
    for (const effect of STANDARD_EFFECTS) {
      expect(effect.defaultPermitted).toBe(false);
    }
  });
});
