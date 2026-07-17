/** Type analysis tests - Prompt 3 §14. */
import { describe, it, expect } from 'vitest';
import { parseText } from '@gspl/parser';
import { lowerToAst } from '../src/ast-lowering.js';
import { createTypeEnvironment, validateStructure, TypeKind, typeName, PRIMITIVE_TYPES, isTypeCompatible } from '../src/type-analysis.js';

function parseAndLower(src: string) {
  var r = parseText('test.gspl', src);
  return lowerToAst(r.root, 'gspl-text/1.0', r.diagnostics);
}

describe('Primitive types', function() {
  it('has scalar', function() { expect(PRIMITIVE_TYPES.get('scalar')).toBeDefined(); });
  it('typeName', function() { expect(typeName(PRIMITIVE_TYPES.get('scalar')!)).toBe('scalar'); });
});

describe('Compatibility', function() {
  it('same primitives', function() {
    var s = PRIMITIVE_TYPES.get('scalar')!;
    expect(isTypeCompatible(s, s)).toBe(true);
  });
  it('different not compat', function() {
    expect(isTypeCompatible(PRIMITIVE_TYPES.get('scalar')!, PRIMITIVE_TYPES.get('string')!)).toBe(false);
  });
  it('any compat with all', function() {
    expect(isTypeCompatible(PRIMITIVE_TYPES.get('any')!, PRIMITIVE_TYPES.get('scalar')!)).toBe(true);
  });
});

describe('Validation', function() {
  it('matching types', function() {
    var src = 'seed 1.0\ngene health: scalar = 100';
    var ast = parseAndLower(src);
    var r = validateStructure(ast.program, createTypeEnvironment());
    expect(r.ok).toBe(true);
    expect(r.diagnostics.length).toBe(0);
  });
  it('type mismatch', function() {
    var src = 'seed 1.0\ngene x: string = 100';
    var ast = parseAndLower(src);
    var r = validateStructure(ast.program, createTypeEnvironment());
    var mm = r.diagnostics.find(function(d: any) { return d.code === 'GSPL-TYPE-MISMATCH'; });
    expect(mm).toBeDefined();
  });
  it('infers integer', function() {
    var src = 'seed 1.0\ngene x = 42';
    var ast = parseAndLower(src);
    expect(validateStructure(ast.program, createTypeEnvironment()).ok).toBe(true);
  });
  it('unknown type', function() {
    var src = 'seed 1.0\ngene x: nonexistent = 1';
    var ast = parseAndLower(src);
    var r = validateStructure(ast.program, createTypeEnvironment());
    var ut = r.diagnostics.find(function(d: any) { return d.code === 'GSPL-TYPE-UNKNOWN-TYPE'; });
    expect(ut).toBeDefined();
  });
  it('float genes', function() {
    var src = 'seed 1.0\ngene speed: float = 3.14';
    var ast = parseAndLower(src);
    expect(validateStructure(ast.program, createTypeEnvironment()).ok).toBe(true);
  });
});

describe('Determinism', function() {
  it('identical results', function() {
    var src = 'seed 1.0\ngene a: scalar = 1\ngene b: scalar = 2';
    function run() {
      var ast = parseAndLower(src);
      return validateStructure(ast.program, createTypeEnvironment());
    }
    var r1 = run(), r2 = run();
    expect(r1.ok).toBe(r2.ok);
    expect(r1.diagnostics.length).toBe(r2.diagnostics.length);
  });
});
