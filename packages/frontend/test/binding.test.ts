/**
 * Symbol binding tests — scopes, symbols, reference resolution.
 * Prompt 3 §13.
 */
import { describe, it, expect } from 'vitest';
import { parseText } from '@gspl/parser';
import { lowerToAst } from '../src/ast-lowering.js';
import { bindProgramSymbols, SymbolKind, ScopeKind } from '../src/binding.js';

function parseAndLower(src: string) {
  const r = parseText('test.gspl', src);
  return lowerToAst(r.root, 'gspl-text/1.0', r.diagnostics);
}

describe('§13 Symbol registration', () => {
  it('registers gene symbols', () => {
    const ast = parseAndLower('seed 1.0\ngene health: scalar = 100');
    const bind = bindProgramSymbols(ast.program);
    expect(bind.diagnostics).toHaveLength(0);
    expect(bind.symbolCount).toBeGreaterThanOrEqual(1);
    // Find the gene symbol
    const geneSym = [...bind.symbolTable.values()].find(function(s) { return s.kind === SymbolKind.Gene; });
    expect(geneSym).toBeDefined();
    expect(geneSym!.name).toBe('health');
    expect(geneSym!.normalizedName).toBe('health');
    expect(geneSym!.isPublic).toBe(true);
  });

  it('registers private genes', () => {
    const ast = parseAndLower('seed 1.0\nprivate gene internal: scalar = 0');
    const bind = bindProgramSymbols(ast.program);
    const geneSym = [...bind.symbolTable.values()].find(function(s) { return s.kind === SymbolKind.Gene; });
    expect(geneSym).toBeDefined();
    expect(geneSym!.isPublic).toBe(false);
  });

  it('registers imports as symbols', () => {
    const ast = parseAndLower('seed 1.0\nimport "lib.gspl" as lib');
    const bind = bindProgramSymbols(ast.program);
    const impSym = [...bind.symbolTable.values()].find(function(s) { return s.kind === SymbolKind.ImportAlias; });
    expect(impSym).toBeDefined();
    expect(impSym!.name).toBe('lib');
  });

  it('registers targets', () => {
    const ast = parseAndLower('seed 1.0\ntarget windows: binary');
    const bind = bindProgramSymbols(ast.program);
    const tgtSym = [...bind.symbolTable.values()].find(function(s) { return s.kind === SymbolKind.Target; });
    expect(tgtSym).toBeDefined();
    expect(tgtSym!.name).toBe('windows');
  });

  it('registers extensions', () => {
    const ast = parseAndLower('seed 1.0\nextension customizer: scalar = 1');
    const bind = bindProgramSymbols(ast.program);
    const extSym = [...bind.symbolTable.values()].find(function(s) { return s.kind === SymbolKind.Extension; });
    expect(extSym).toBeDefined();
    expect(extSym!.name).toBe('customizer');
  });

  it('registers exports', () => {
    const ast = parseAndLower('seed 1.0\nexport { health }\ngene health: scalar = 0');
    const bind = bindProgramSymbols(ast.program);
    const expSym = [...bind.symbolTable.values()].find(function(s) { return s.kind === SymbolKind.Export; });
    expect(expSym).toBeDefined();
    expect(expSym!.name).toBe('health');
    expect(expSym!.isPublic).toBe(true);
  });

  it('normalizes names to lowercase', () => {
    const ast = parseAndLower('seed 1.0\ngene Health: scalar = 0');
    const bind = bindProgramSymbols(ast.program);
    const geneSym = [...bind.symbolTable.values()].find(function(s) { return s.kind === SymbolKind.Gene; });
    expect(geneSym).toBeDefined();
    expect(geneSym!.name).toBe('Health');
    expect(geneSym!.normalizedName).toBe('health');
  });
});

describe('§13 Scope tree', () => {
  it('creates module scope', () => {
    const ast = parseAndLower('seed 1.0');
    const bind = bindProgramSymbols(ast.program);
    expect(bind.moduleScope.kind).toBe(ScopeKind.Module);
    expect(bind.moduleScope.parent).toBeUndefined();
  });

  it('creates seed scope as child of module', () => {
    const ast = parseAndLower('seed 1.0\ngene x: scalar = 0');
    const bind = bindProgramSymbols(ast.program);
    expect(bind.moduleScope.children.length).toBeGreaterThanOrEqual(1);
    const seedScope = bind.moduleScope.children.find(function(c) { return c.kind === ScopeKind.Seed; });
    expect(seedScope).toBeDefined();
  });

  it('creates gene scope as child of seed', () => {
    const ast = parseAndLower('seed 1.0\ngene x: scalar = 0');
    const bind = bindProgramSymbols(ast.program);
    const seedScope = bind.moduleScope.children.find(function(c) { return c.kind === ScopeKind.Seed; });
    expect(seedScope).toBeDefined();
    expect(seedScope!.children.length).toBeGreaterThanOrEqual(1);
    const geneScope = seedScope!.children.find(function(c) { return c.kind === ScopeKind.Gene; });
    expect(geneScope).toBeDefined();
  });

  it('scope count matches expected', () => {
    const ast = parseAndLower('seed 1.0\ngene a: scalar = 0\ngene b: scalar = 0\ngene c: scalar = 0');
    const bind = bindProgramSymbols(ast.program);
    // Module + Seed + 3 Gene scopes = 5
    expect(bind.scopeCount).toBe(5);
  });
});

describe('§13 Reference resolution', () => {
  it('resolves identifier references to genes', () => {
    const ast = parseAndLower('seed 1.0\ngene a: scalar = 1\ngene b: scalar = a');
    const bind = bindProgramSymbols(ast.program);
    expect(bind.diagnostics.length).toBe(0);
    expect(bind.referenceBindings.size).toBe(1);
  });

  it('emits diagnostic for unresolved names', () => {
    const ast = parseAndLower('seed 1.0\ngene a: scalar = undefinedGene');
    const bind = bindProgramSymbols(ast.program);
    const unresolved = bind.diagnostics.find(function(d) {
      return d.code === 'GSPL-BIND-UNRESOLVED-NAME';
    });
    expect(unresolved).toBeDefined();
  });

  it('emits diagnostic for duplicate declarations', () => {
    const ast = parseAndLower('seed 1.0\ngene x: scalar = 0\ngene x: scalar = 1');
    const bind = bindProgramSymbols(ast.program);
    const dup = bind.diagnostics.find(function(d) {
      return d.code === 'GSPL-BIND-DUPLICATE-DECLARATION';
    });
    expect(dup).toBeDefined();
  });

  it('resolves references across genes', () => {
    const ast = parseAndLower('seed 1.0\ngene base: scalar = 100\ngene derived: scalar = base + 10');
    const bind = bindProgramSymbols(ast.program);
    // Should have 1 resolved reference (base in derived)
    expect(bind.referenceBindings.size).toBe(1);
  });
});

describe('§13 Determinism', () => {
  it('produces identical results for repeated binding', () => {
    const src = 'seed 1.0\ngene a: scalar = 1\ngene b: scalar = a + 2';
    function run() {
      const ast = parseAndLower(src);
      return bindProgramSymbols(ast.program);
    }
    const r1 = run();
    const r2 = run();
    expect(r1.symbolCount).toBe(r2.symbolCount);
    expect(r1.scopeCount).toBe(r2.scopeCount);
    expect(r1.referenceBindings.size).toBe(r2.referenceBindings.size);
    expect(r1.diagnostics.length).toBe(r2.diagnostics.length);
  });
});
