/**
 * §11 AST lowering tests.
 * Prompt 3 §11.
 */
import { describe, it, expect } from 'vitest';
import { parseText } from '@gspl/parser';
import { SyntaxKind } from '@gspl/syntax-tree';
import {
  lowerToAst,
  AstKind,
  isProgram,
  isSeedDecl,
  isGeneDecl,
  isNamedType,
  isListType,
  isMapType,
  isOptionalType,
  isLiteralExpr,
  isIdentifierExpr,
  isBinaryExpr,
  isUnaryExpr,
  isListExpr,
  isRecordExpr,
  isConstraintBlock,
  isEffectsBlock,
  isBudgetBlock,
  type ExprNode,
  type TypeNode,
} from '../src/index.js';

describe('§11 Program lowering', () => {
  it('lowers a minimal seed program', () => {
    const result = parseText('test:min', 'seed 1.0');
    const ast = lowerToAst(result.root, 'gspl-text/1.0');
    expect(isProgram(ast.program)).toBe(true);
    expect(ast.program.languageVersion).toBe('gspl-text/1.0');
    expect(ast.program.seed).toBeDefined();
    expect(isSeedDecl(ast.program.seed!)).toBe(true);
    expect(ast.program.seed!.version).toBe('1.0');
  });

  it('produces deterministic node IDs', () => {
    const src = 'seed 1.0\ngene x: scalar = 42';
    const r1 = parseText('test:det1', src);
    const ast1 = lowerToAst(r1.root, 'gspl-text/1.0');
    const r2 = parseText('test:det2', src);
    const ast2 = lowerToAst(r2.root, 'gspl-text/1.0');
    expect(ast1.nodeCount).toBe(ast2.nodeCount);
    expect(ast1.program.id).toBe(ast2.program.id);
    expect(ast1.program.seed!.id).toBe(ast2.program.seed!.id);
  });

  it('tracks node count', () => {
    const result = parseText('test:count', 'seed 1.0\ngene a: scalar = 1\ngene b: scalar = 2');
    const ast = lowerToAst(result.root, 'gspl-text/1.0');
    expect(ast.nodeCount).toBeGreaterThan(5);
  });
});

describe('§11 Import/Export lowering', () => {
  it('lowers import declarations', () => {
    const src = 'import "pkg/mod" as mod\nseed 1.0';
    const result = parseText('test:imp', src);
    const ast = lowerToAst(result.root, 'gspl-text/1.0');
    expect(ast.program.imports.length).toBe(1);
    expect(ast.program.imports[0]!.path).toBe('pkg/mod');
    expect(ast.program.imports[0]!.alias).toBe('mod');
  });

  it('lowers import without alias', () => {
    const src = 'import "pkg/mod"\nseed 1.0';
    const result = parseText('test:imp2', src);
    const ast = lowerToAst(result.root, 'gspl-text/1.0');
    expect(ast.program.imports[0]!.alias).toBeUndefined();
  });

  it('lowers export declarations', () => {
    const src = 'export { foo, bar }\nseed 1.0';
    const result = parseText('test:exp', src);
    const ast = lowerToAst(result.root, 'gspl-text/1.0');
    expect(ast.program.exports.length).toBe(1);
    expect(ast.program.exports[0]!.names).toEqual(['foo', 'bar']);
  });
});

describe('§11 Gene declaration lowering', () => {
  it('lowers gene with type and value', () => {
    const src = 'seed 1.0\ngene health: scalar = 100';
    const result = parseText('test:gene', src);
    const ast = lowerToAst(result.root, 'gspl-text/1.0');
    const genes = ast.program.seed!.genes;
    expect(genes.length).toBe(1);
    expect(genes[0]!.name).toBe('health');
    expect(genes[0]!.isPrivate).toBe(false);
    expect(genes[0]!.typeAnnotation).toBeDefined();
    expect(genes[0]!.value).toBeDefined();
    if (isNamedType(genes[0]!.typeAnnotation!)) {
      expect(genes[0]!.typeAnnotation!.name).toBe('scalar');
    }
    if (isLiteralExpr(genes[0]!.value!)) {
      expect(genes[0]!.value!.literalKind).toBe('integer');
      expect(genes[0]!.value!.value).toBe('100');
    }
  });

  it('lowers private gene', () => {
    const src = 'seed 1.0\nprivate gene temp: scalar = 0';
    const result = parseText('test:priv', src);
    const ast = lowerToAst(result.root, 'gspl-text/1.0');
    expect(ast.program.seed!.genes[0]!.isPrivate).toBe(true);
    expect(ast.program.seed!.genes[0]!.name).toBe('temp');
  });

  it('lowers gene without type or value', () => {
    const src = 'seed 1.0\ngene speed';
    const result = parseText('test:naked', src);
    const ast = lowerToAst(result.root, 'gspl-text/1.0');
    expect(ast.program.seed!.genes[0]!.typeAnnotation).toBeUndefined();
    expect(ast.program.seed!.genes[0]!.value).toBeUndefined();
  });

  it('lowers gene with confidence', () => {
    const src = 'seed 1.0\ngene x: scalar = 42 confidence 0.95';
    const result = parseText('test:conf', src);
    const ast = lowerToAst(result.root, 'gspl-text/1.0');
    expect(ast.program.seed!.genes[0]!.confidence).toBe(0.95);
  });
});

describe('§11 Type lowering', () => {
  it('lowers named type', () => {
    const src = 'seed 1.0\ngene x: scalar = 1';
    const result = parseText('test:type1', src);
    const ast = lowerToAst(result.root, 'gspl-text/1.0');
    const t: TypeNode = ast.program.seed!.genes[0]!.typeAnnotation!;
    expect(isNamedType(t)).toBe(true);
    if (isNamedType(t)) expect(t.name).toBe('scalar');
  });

  it('lowers list type', () => {
    const src = 'seed 1.0\ngene x: [scalar] = 1';
    const result = parseText('test:type2', src);
    const ast = lowerToAst(result.root, 'gspl-text/1.0');
    const t: TypeNode = ast.program.seed!.genes[0]!.typeAnnotation!;
    expect(isListType(t)).toBe(true);
    if (isListType(t)) {
      if (isNamedType(t.elementType)) expect(t.elementType.name).toBe('scalar');
    }
  });

  it('lowers optional type', () => {
    const src = 'seed 1.0\ngene x: scalar? = none';
    const result = parseText('test:type3', src);
    const ast = lowerToAst(result.root, 'gspl-text/1.0');
    const t: TypeNode = ast.program.seed!.genes[0]!.typeAnnotation!;
    expect(isOptionalType(t)).toBe(true);
    if (isOptionalType(t)) {
      if (isNamedType(t.inner)) expect(t.inner.name).toBe('scalar');
    }
  });

  it('lowers map/record type', () => {
    const src = 'seed 1.0\ngene x: { a: scalar, b: scalar } = none';
    const result = parseText('test:type4', src);
    const ast = lowerToAst(result.root, 'gspl-text/1.0');
    const t: TypeNode = ast.program.seed!.genes[0]!.typeAnnotation!;
    expect(isMapType(t)).toBe(true);
    if (isMapType(t)) {
      expect(t.fields.length).toBe(2);
      expect(t.fields[0]!.name).toBe('a');
      expect(t.fields[1]!.name).toBe('b');
    }
  });
});

describe('§11 Expression lowering', () => {
  it('lowers integer literal', () => {
    const result = parseText('test:lint', 'seed 1.0\ngene x: scalar = 42');
    const ast = lowerToAst(result.root, 'gspl-text/1.0');
    const v: ExprNode = ast.program.seed!.genes[0]!.value!;
    expect(isLiteralExpr(v)).toBe(true);
    if (isLiteralExpr(v)) {
      expect(v.literalKind).toBe('integer');
      expect(v.value).toBe('42');
    }
  });

  it('lowers float literal', () => {
    const result = parseText('test:lflt', 'seed 1.0\ngene x: scalar = 3.14');
    const ast = lowerToAst(result.root, 'gspl-text/1.0');
    const v: ExprNode = ast.program.seed!.genes[0]!.value!;
    if (isLiteralExpr(v)) expect(v.literalKind).toBe('float');
  });

  it('lowers string literal', () => {
    const result = parseText('test:lstr', 'seed 1.0\ngene x: scalar = "hello"');
    const ast = lowerToAst(result.root, 'gspl-text/1.0');
    const v: ExprNode = ast.program.seed!.genes[0]!.value!;
    if (isLiteralExpr(v)) expect(v.literalKind).toBe('string');
  });

  it('lowers boolean literal', () => {
    const result = parseText('test:lbool', 'seed 1.0\ngene x: scalar = true');
    const ast = lowerToAst(result.root, 'gspl-text/1.0');
    const v: ExprNode = ast.program.seed!.genes[0]!.value!;
    if (isLiteralExpr(v)) expect(v.literalKind).toBe('boolean');
  });

  it('lowers absence literal', () => {
    const result = parseText('test:labs', 'seed 1.0\ngene x: scalar = none');
    const ast = lowerToAst(result.root, 'gspl-text/1.0');
    const v: ExprNode = ast.program.seed!.genes[0]!.value!;
    if (isLiteralExpr(v)) expect(v.literalKind).toBe('absence');
  });

  it('lowers identifier reference', () => {
    const result = parseText('test:lident', 'seed 1.0\ngene x: scalar = otherGene');
    const ast = lowerToAst(result.root, 'gspl-text/1.0');
    const v: ExprNode = ast.program.seed!.genes[0]!.value!;
    expect(isIdentifierExpr(v)).toBe(true);
    if (isIdentifierExpr(v)) expect(v.name).toBe('otherGene');
  });

  it('lowers binary expression', () => {
    const result = parseText('test:lbin', 'seed 1.0\ngene x: scalar = 1 + 2');
    const ast = lowerToAst(result.root, 'gspl-text/1.0');
    const v: ExprNode = ast.program.seed!.genes[0]!.value!;
    expect(isBinaryExpr(v)).toBe(true);
    if (isBinaryExpr(v)) {
      expect(v.operator).toBe('+');
      expect(isLiteralExpr(v.left)).toBe(true);
      if (isLiteralExpr(v.left)) expect(v.left.value).toBe('1');
      expect(isLiteralExpr(v.right)).toBe(true);
      if (isLiteralExpr(v.right)) expect(v.right.value).toBe('2');
    }
  });

  it('lowers unary expression', () => {
    const result = parseText('test:lun', 'seed 1.0\ngene x: scalar = -42');
    const ast = lowerToAst(result.root, 'gspl-text/1.0');
    const v: ExprNode = ast.program.seed!.genes[0]!.value!;
    expect(isUnaryExpr(v)).toBe(true);
    if (isUnaryExpr(v)) {
      expect(v.operator).toBe('-');
      expect(isLiteralExpr(v.operand)).toBe(true);
    }
  });

  it('lowers list expression', () => {
    const result = parseText('test:llist', 'seed 1.0\ngene x: scalar = [1, 2, 3]');
    const ast = lowerToAst(result.root, 'gspl-text/1.0');
    const v: ExprNode = ast.program.seed!.genes[0]!.value!;
    expect(isListExpr(v)).toBe(true);
    if (isListExpr(v)) {
      expect(v.elements.length).toBe(3);
      if (isLiteralExpr(v.elements[0]!)) expect(v.elements[0]!.value).toBe('1');
      if (isLiteralExpr(v.elements[2]!)) expect(v.elements[2]!.value).toBe('3');
    }
  });

  it('lowers record expression', () => {
    const result = parseText('test:lrec', 'seed 1.0\ngene x: scalar = { a: 1, b: 2 }');
    const ast = lowerToAst(result.root, 'gspl-text/1.0');
    const v: ExprNode = ast.program.seed!.genes[0]!.value!;
    expect(isRecordExpr(v)).toBe(true);
    if (isRecordExpr(v)) {
      expect(v.fields.length).toBe(2);
      expect(v.fields[0]!.name).toBe('a');
      expect(v.fields[1]!.name).toBe('b');
    }
  });

  it('lowers nested binary expression', () => {
    const result = parseText('test:lnest', 'seed 1.0\ngene x: scalar = 1 + 2 * 3');
    const ast = lowerToAst(result.root, 'gspl-text/1.0');
    const v: ExprNode = ast.program.seed!.genes[0]!.value!;
    expect(isBinaryExpr(v)).toBe(true);
    if (isBinaryExpr(v)) {
      expect(v.operator).toBe('+');
      expect(isBinaryExpr(v.right)).toBe(true);
      if (isBinaryExpr(v.right)) expect(v.right.operator).toBe('*');
    }
  });

  it('lowers parenthesized expression (regression for HIGH bug)', () => {
    const result = parseText('test:lparen', 'seed 1.0\ngene x: scalar = (1 + 2)');
    const ast = lowerToAst(result.root, 'gspl-text/1.0');
    const v: ExprNode = ast.program.seed!.genes[0]!.value!;
    // Parentheses are semantically transparent — the inner binary expression should be returned
    expect(isBinaryExpr(v)).toBe(true);
    if (isBinaryExpr(v)) {
      expect(v.operator).toBe('+');
      if (isLiteralExpr(v.left)) expect(v.left.value).toBe('1');
      if (isLiteralExpr(v.right)) expect(v.right.value).toBe('2');
    }
  });
});

describe('§11 Diagnostics merge', () => {
  it('merges parser diagnostics into lowering result', () => {
    // Source with a parse error (missing version after seed)
    const result = parseText('test:diag', 'seed\ngene x: scalar = 1');
    const ast = lowerToAst(result.root, 'gspl-text/1.0', result.diagnostics);
    // Parser should have emitted a diagnostic about expected version
    expect(ast.diagnostics.length).toBeGreaterThanOrEqual(1);
    // The parser diagnostic should be present
    expect(ast.diagnostics.some(d => d.code.startsWith('GSPL-PARSE'))).toBe(true);
  });
});

describe('§11 Block lowering', () => {
  it('lowers constraint block', () => {
    const result = parseText('test:cb', 'seed 1.0\nconstraints { require x > 0 }');
    const ast = lowerToAst(result.root, 'gspl-text/1.0');
    expect(ast.program.seed!.constraints).toBeDefined();
    expect(isConstraintBlock(ast.program.seed!.constraints!)).toBe(true);
  });

  it('lowers effects block', () => {
    const result = parseText('test:eb', 'seed 1.0\neffects { filesystem }');
    const ast = lowerToAst(result.root, 'gspl-text/1.0');
    expect(ast.program.seed!.effects).toBeDefined();
    expect(isEffectsBlock(ast.program.seed!.effects!)).toBe(true);
  });

  it('lowers budget block', () => {
    const result = parseText('test:bb', 'seed 1.0\nbudget { require x < 100 }');
    const ast = lowerToAst(result.root, 'gspl-text/1.0');
    expect(ast.program.seed!.budget).toBeDefined();
    expect(isBudgetBlock(ast.program.seed!.budget!)).toBe(true);
  });
});

describe('§11 Target and Extension lowering', () => {
  it('lowers target declaration', () => {
    const result = parseText('test:td', 'seed 1.0\ntarget gpu: equivalence { require x }');
    const ast = lowerToAst(result.root, 'gspl-text/1.0');
    expect(ast.program.seed!.targets.length).toBe(1);
    expect(ast.program.seed!.targets[0]!.name).toBe('gpu');
  });

  it('lowers extension declaration', () => {
    const result = parseText('test:ext', 'seed 1.0\nextension custom(x: scalar): scalar = x');
    const ast = lowerToAst(result.root, 'gspl-text/1.0');
    expect(ast.program.seed!.extensions.length).toBe(1);
    expect(ast.program.seed!.extensions[0]!.name).toBe('custom');
    expect(ast.program.seed!.extensions[0]!.parameters.length).toBe(1);
    expect(ast.program.seed!.extensions[0]!.parameters[0]!.name).toBe('x');
  });
});

describe('§11 SyntaxReference and provenance', () => {
  it('every AST node has a syntax reference', () => {
    const result = parseText('test:sr', 'seed 1.0\ngene x: scalar = 42');
    const ast = lowerToAst(result.root, 'gspl-text/1.0');
    const program = ast.program;
    expect(program.syntax).toBeDefined();
    expect(program.syntax.kind).toBe(SyntaxKind.CompilationUnit);
    if (program.seed) {
      expect(program.seed.syntax.kind).toBe(SyntaxKind.SeedDeclaration);
      const gene = program.seed.genes[0]!;
      expect(gene.syntax.kind).toBe(SyntaxKind.GeneDeclaration);
      if (gene.value) expect(gene.value.syntax.kind).toBe(SyntaxKind.Expression);
    }
  });

  it('every AST node has a span', () => {
    const result = parseText('test:sp', 'seed 1.0\ngene x: scalar = 42');
    const ast = lowerToAst(result.root, 'gspl-text/1.0');
    expect(ast.program.span.start).toBe(0);
    expect(ast.program.span.end).toBeGreaterThan(0);
    const gene = ast.program.seed!.genes[0]!;
    expect(gene.span.start).toBeGreaterThanOrEqual(0);
    expect(gene.span.end).toBeGreaterThan(gene.span.start);
  });
});
