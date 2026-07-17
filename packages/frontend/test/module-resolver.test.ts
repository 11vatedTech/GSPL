/**
 * Module resolver tests - import resolution, module graph, cycle detection.
 * Prompt 3 §12.
 */
import { describe, it, expect } from 'vitest';
import {
  ModuleResolver,
  MemorySourceProvider,
  type MemorySourceEntry,
} from '../src/module-resolver.js';

function moduleSrc(opts: {
  imports?: string[];
  exports?: string[];
  genes?: string[];
}): string {
  const lines: string[] = ['seed 1.0'];
  if (opts.imports) {
    for (const imp of opts.imports) lines.push('import "' + imp + '"');
  }
  if (opts.exports) {
    lines.push('export { ' + opts.exports.join(', ') + ' }');
  }
  if (opts.genes) {
    for (const g of opts.genes) lines.push('gene ' + g + ': scalar = 0');
  }
  return lines.join('\n');
}

function makeProvider(entries: readonly MemorySourceEntry[]): MemorySourceProvider {
  return new MemorySourceProvider(entries);
}

function makeResolver(opts?: { maxModules?: number }): ModuleResolver {
  return new ModuleResolver(opts);
}

describe('§12 MemorySourceProvider', () => {
  it('normalizes paths', () => {
    const p = makeProvider([]);
    expect(p.normalizePath('foo.gspl')).toBe('/foo.gspl');
    expect(p.normalizePath('/bar/baz.gspl')).toBe('/bar/baz.gspl');
    expect(p.normalizePath('a/../b.gspl')).toBe('/b.gspl');
  });

  it('loads existing source', () => {
    const p = makeProvider([{ logicalPath: '/main.gspl', text: 'seed 1.0' }]);
    const r = p.loadSource('/main.gspl');
    expect(r.ok).toBe(true);
    expect(r.source!.text).toBe('seed 1.0');
  });

  it('reports missing source', () => {
    const p = makeProvider([]);
    const r = p.loadSource('/missing.gspl');
    expect(r.ok).toBe(false);
    expect(r.diagnostics[0].code).toBe('GSPL-MODULE-NOT-FOUND');
  });
});

describe('§12 Import resolution', () => {
  it('resolves a simple import', () => {
    const provider = makeProvider([
      { logicalPath: '/main.gspl', text: moduleSrc({ imports: ['lib.gspl'] }) },
      { logicalPath: '/lib.gspl', text: moduleSrc({ exports: ['helper'] }) },
    ]);
    const resolver = makeResolver();
    const mainSrc = provider.loadSource('/main.gspl');
    const result = resolver.resolveAll(
      [{ source: mainSrc.source!, logicalPath: '/main.gspl' }],
      provider,
    );
    expect(result.diagnostics).toHaveLength(0);
    expect(result.graph.modules).toHaveLength(2);
    expect(result.graph.isDag).toBe(true);
  });

  it('resolves relative imports', () => {
    const provider = makeProvider([
      { logicalPath: '/src/main.gspl', text: moduleSrc({ imports: ['./lib.gspl'] }) },
      { logicalPath: '/src/lib.gspl', text: moduleSrc({ exports: ['helper'] }) },
    ]);
    const resolver = makeResolver();
    const mainSrc = provider.loadSource('/src/main.gspl');
    const result = resolver.resolveAll(
      [{ source: mainSrc.source!, logicalPath: '/src/main.gspl' }],
      provider,
    );
    expect(result.graph.modules).toHaveLength(2);
  });

  it('resolves import with alias', () => {
    const provider = makeProvider([
      { logicalPath: '/main.gspl', text: 'seed 1.0\nimport "lib.gspl" as lib\nexport { lib }' },
      { logicalPath: '/lib.gspl', text: 'seed 1.0' },
    ]);
    const resolver = makeResolver();
    const mainSrc = provider.loadSource('/main.gspl');
    const result = resolver.resolveAll(
      [{ source: mainSrc.source!, logicalPath: '/main.gspl' }],
      provider,
    );
    const mainMod = result.graph.modules.find(function(m) {
      return m.identity.logicalPath === '/main.gspl';
    })!;
    expect(mainMod.imports[0].alias).toBe('lib');
  });

  it('emits diagnostics for missing imports', () => {
    const provider = makeProvider([
      { logicalPath: '/main.gspl', text: moduleSrc({ imports: ['nonexistent.gspl'] }) },
    ]);
    const resolver = makeResolver();
    const mainSrc = provider.loadSource('/main.gspl');
    const result = resolver.resolveAll(
      [{ source: mainSrc.source!, logicalPath: '/main.gspl' }],
      provider,
    );
    const notFoundDiag = result.diagnostics.find(function(d) {
      return d.code === 'GSPL-MODULE-NOT-FOUND';
    });
    expect(notFoundDiag).toBeDefined();
  });

  it('collects export names', () => {
    const provider = makeProvider([
      { logicalPath: '/main.gspl', text: 'seed 1.0\nexport { foo, bar }\ngene x: scalar = 0' },
    ]);
    const resolver = makeResolver();
    const mainSrc = provider.loadSource('/main.gspl');
    const result = resolver.resolveAll(
      [{ source: mainSrc.source!, logicalPath: '/main.gspl' }],
      provider,
    );
    const mainMod = result.graph.modules[0];
    expect(mainMod.exports).toContain('foo');
    expect(mainMod.exports).toContain('bar');
  });
});

describe('§12 Module graph', () => {
  it('builds adjacency list', () => {
    const provider = makeProvider([
      { logicalPath: '/a.gspl', text: moduleSrc({ imports: ['b.gspl'] }) },
      { logicalPath: '/b.gspl', text: moduleSrc({ imports: ['c.gspl'] }) },
      { logicalPath: '/c.gspl', text: moduleSrc({ exports: ['val'] }) },
    ]);
    const resolver = makeResolver();
    const mainSrc = provider.loadSource('/a.gspl');
    const result = resolver.resolveAll(
      [{ source: mainSrc.source!, logicalPath: '/a.gspl' }],
      provider,
    );
    expect(result.graph.adjacency.get('/a.gspl')).toEqual(['/b.gspl']);
    expect(result.graph.adjacency.get('/b.gspl')).toEqual(['/c.gspl']);
  });

  it('produces topological order for DAG', () => {
    const provider = makeProvider([
      { logicalPath: '/a.gspl', text: moduleSrc({ imports: ['b.gspl', 'c.gspl'] }) },
      { logicalPath: '/b.gspl', text: moduleSrc({ imports: ['c.gspl'] }) },
      { logicalPath: '/c.gspl', text: moduleSrc({ exports: ['val'] }) },
    ]);
    const resolver = makeResolver();
    const mainSrc = provider.loadSource('/a.gspl');
    const result = resolver.resolveAll(
      [{ source: mainSrc.source!, logicalPath: '/a.gspl' }],
      provider,
    );
    expect(result.graph.isDag).toBe(true);
    const topo = result.graph.topologicalOrder;
    const cIdx = topo.indexOf('/c.gspl');
    const bIdx = topo.indexOf('/b.gspl');
    const aIdx = topo.indexOf('/a.gspl');
    expect(cIdx).toBeLessThan(bIdx);
    expect(bIdx).toBeLessThan(aIdx);
  });

  it('handles single module with no imports', () => {
    const provider = makeProvider([
      { logicalPath: '/solo.gspl', text: moduleSrc({ genes: ['x'] }) },
    ]);
    const resolver = makeResolver();
    const mainSrc = provider.loadSource('/solo.gspl');
    const result = resolver.resolveAll(
      [{ source: mainSrc.source!, logicalPath: '/solo.gspl' }],
      provider,
    );
    expect(result.graph.isDag).toBe(true);
    expect(result.graph.topologicalOrder).toEqual(['/solo.gspl']);
  });
});

describe('§12 Cycle detection', () => {
  it('detects a two-module cycle', () => {
    const provider = makeProvider([
      { logicalPath: '/a.gspl', text: moduleSrc({ imports: ['b.gspl'] }) },
      { logicalPath: '/b.gspl', text: moduleSrc({ imports: ['a.gspl'] }) },
    ]);
    const resolver = makeResolver();
    const mainSrc = provider.loadSource('/a.gspl');
    const result = resolver.resolveAll(
      [{ source: mainSrc.source!, logicalPath: '/a.gspl' }],
      provider,
    );
    expect(result.graph.isDag).toBe(false);
    expect(result.graph.cycles.length).toBeGreaterThanOrEqual(1);
    expect(result.graph.topologicalOrder).toHaveLength(0);
    const cycleDiag = result.diagnostics.find(function(d) {
      return d.code === 'GSPL-MODULE-CYCLE';
    });
    expect(cycleDiag).toBeDefined();
  });

  it('detects a three-module cycle', () => {
    const provider = makeProvider([
      { logicalPath: '/a.gspl', text: moduleSrc({ imports: ['b.gspl'] }) },
      { logicalPath: '/b.gspl', text: moduleSrc({ imports: ['c.gspl'] }) },
      { logicalPath: '/c.gspl', text: moduleSrc({ imports: ['a.gspl'] }) },
    ]);
    const resolver = makeResolver();
    const mainSrc = provider.loadSource('/a.gspl');
    const result = resolver.resolveAll(
      [{ source: mainSrc.source!, logicalPath: '/a.gspl' }],
      provider,
    );
    expect(result.graph.isDag).toBe(false);
    const cycle = result.graph.cycles.find(function(c) {
      return c.members.length === 3;
    });
    expect(cycle).toBeDefined();
  });

  it('detects a self-loop', () => {
    const provider = makeProvider([
      { logicalPath: '/self.gspl', text: moduleSrc({ imports: ['self.gspl'] }) },
    ]);
    const resolver = makeResolver();
    const mainSrc = provider.loadSource('/self.gspl');
    const result = resolver.resolveAll(
      [{ source: mainSrc.source!, logicalPath: '/self.gspl' }],
      provider,
    );
    expect(result.graph.isDag).toBe(false);
  });

  it('does not report false cycle for DAG with shared dependency', () => {
    const provider = makeProvider([
      { logicalPath: '/a.gspl', text: moduleSrc({ imports: ['c.gspl'] }) },
      { logicalPath: '/b.gspl', text: moduleSrc({ imports: ['c.gspl'] }) },
      { logicalPath: '/c.gspl', text: moduleSrc({ exports: ['shared'] }) },
    ]);
    const resolver = makeResolver();
    const mainSrc = provider.loadSource('/a.gspl');
    const result = resolver.resolveAll(
      [{ source: mainSrc.source!, logicalPath: '/a.gspl' }],
      provider,
    );
    expect(result.graph.isDag).toBe(true);
    expect(result.graph.cycles).toHaveLength(0);
  });

  it('passes diamond dependency without false cycle', () => {
    const provider = makeProvider([
      { logicalPath: '/a.gspl', text: moduleSrc({ imports: ['b.gspl', 'c.gspl'] }) },
      { logicalPath: '/b.gspl', text: moduleSrc({ imports: ['d.gspl'] }) },
      { logicalPath: '/c.gspl', text: moduleSrc({ imports: ['d.gspl'] }) },
      { logicalPath: '/d.gspl', text: moduleSrc({ exports: ['base'] }) },
    ]);
    const resolver = makeResolver();
    const mainSrc = provider.loadSource('/a.gspl');
    const result = resolver.resolveAll(
      [{ source: mainSrc.source!, logicalPath: '/a.gspl' }],
      provider,
    );
    expect(result.graph.isDag).toBe(true);
    const topo = result.graph.topologicalOrder;
    const dIdx = topo.indexOf('/d.gspl');
    const bIdx = topo.indexOf('/b.gspl');
    const cIdx = topo.indexOf('/c.gspl');
    const aIdx = topo.indexOf('/a.gspl');
    expect(dIdx).toBeLessThan(bIdx);
    expect(dIdx).toBeLessThan(cIdx);
    expect(bIdx).toBeLessThan(aIdx);
    expect(cIdx).toBeLessThan(aIdx);
  });
});

describe('§12 Determinism', () => {
  it('produces identical results for repeated resolution', () => {
    const entries: MemorySourceEntry[] = [
      { logicalPath: '/a.gspl', text: moduleSrc({ imports: ['b.gspl', 'c.gspl'] }) },
      { logicalPath: '/b.gspl', text: moduleSrc({ imports: ['d.gspl'] }) },
      { logicalPath: '/c.gspl', text: moduleSrc({ imports: ['d.gspl'] }) },
      { logicalPath: '/d.gspl', text: moduleSrc({ exports: ['base'] }) },
    ];
    function run() {
      const p = makeProvider(entries);
      const r = makeResolver();
      const src = p.loadSource('/a.gspl');
      return r.resolveAll([{ source: src.source!, logicalPath: '/a.gspl' }], p);
    }
    const run1 = run();
    const run2 = run();
    expect(run1.graph.isDag).toBe(run2.graph.isDag);
    expect(run1.graph.topologicalOrder).toEqual(run2.graph.topologicalOrder);
    expect(run1.graph.modules.length).toBe(run2.graph.modules.length);
  });
});

describe('§12 Module limit', () => {
  it('enforces maxModules limit', () => {
    const entries: MemorySourceEntry[] = [];
    for (let i = 0; i < 20; i++) {
      const imps = i < 19 ? ['mod' + (i + 1) + '.gspl'] : undefined;
      entries.push({
        logicalPath: '/mod' + i + '.gspl',
        text: moduleSrc({ imports: imps, exports: ['val' + i] }),
      });
    }
    const provider = makeProvider(entries);
    const resolver = new ModuleResolver({ maxModules: 5 });
    const src = provider.loadSource('/mod0.gspl');
    const result = resolver.resolveAll(
      [{ source: src.source!, logicalPath: '/mod0.gspl' }],
      provider,
    );
    expect(result.graph.modules.length).toBeLessThanOrEqual(5);
    const limitDiag = result.diagnostics.find(function(d) {
      return d.code === 'GSPL-MODULE-TOO-MANY';
    });
    expect(limitDiag).toBeDefined();
  });
});
