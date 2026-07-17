/**
 * §10 Typed CST accessor tests.
 * Prompt 3 §10.
 */
import { describe, it, expect } from 'vitest';
import {
  SyntaxKind,
  GreenToken,
  GreenNode,
  createSyntaxTree,
  isRedNode,
  CompilationUnitSyntax,
  GeneDeclarationSyntax,
  ImportDeclarationSyntax,
  ExportDeclarationSyntax,
  ExpressionSyntax,
  TypeExpressionSyntax,
  getCompilationUnit,
  type RedNode,
} from '../src/index.js';

/** Helper: find first red child of a given kind. */
function findChild(root: RedNode, kind: SyntaxKind): RedNode | undefined {
  for (const c of root.children) {
    if (isRedNode(c) && c.kind === kind) return c;
  }
  return undefined;
}

describe('§10 CompilationUnitSyntax', () => {
  it('wraps a CompilationUnit red node', () => {
    const seed = GreenToken.fromText(SyntaxKind.KeywordSeed, 'seed');
    const ver = GreenToken.fromText(SyntaxKind.FloatLiteral, '1.0');
    const seedDecl = GreenNode.create(SyntaxKind.SeedDeclaration, [seed, ver]);
    const root = GreenNode.create(SyntaxKind.CompilationUnit, [seedDecl]);
    const tree = createSyntaxTree('src:t' as any, root, 8);
    const cu = getCompilationUnit(tree);
    expect(cu.kind).toBe(SyntaxKind.CompilationUnit);
    expect(cu.seedDeclaration).toBeDefined();
    expect(cu.seedDeclaration!.seedKeyword).toBe('seed');
    expect(cu.seedDeclaration!.versionLiteral).toBe('1.0');
  });

  it('throws on wrong kind', () => {
    const tok = GreenToken.fromText(SyntaxKind.Identifier, 'x');
    const expr = GreenNode.create(SyntaxKind.Expression, [tok]);
    const root = GreenNode.create(SyntaxKind.CompilationUnit, [expr]);
    const tree = createSyntaxTree('src:t' as any, root, 1);
    const wrongNode = findChild(tree.root, SyntaxKind.Expression)!;
    expect(() => new CompilationUnitSyntax(wrongNode)).toThrow();
  });

  it('returns undefined for seedDeclaration when absent', () => {
    const tok = GreenToken.fromText(SyntaxKind.Identifier, 'x');
    const expr = GreenNode.create(SyntaxKind.Expression, [tok]);
    const root = GreenNode.create(SyntaxKind.CompilationUnit, [expr]);
    const tree = createSyntaxTree('src:t' as any, root, 1);
    const cu = getCompilationUnit(tree);
    expect(cu.seedDeclaration).toBeUndefined();
  });

  it('collects top-level gene declarations', () => {
    const gene1 = GreenNode.create(SyntaxKind.GeneDeclaration, [
      GreenToken.fromText(SyntaxKind.KeywordGene, 'gene'),
      GreenToken.fromText(SyntaxKind.Identifier, 'a'),
    ]);
    const gene2 = GreenNode.create(SyntaxKind.GeneDeclaration, [
      GreenToken.fromText(SyntaxKind.KeywordGene, 'gene'),
      GreenToken.fromText(SyntaxKind.Identifier, 'b'),
    ]);
    const root = GreenNode.create(SyntaxKind.CompilationUnit, [gene1, gene2]);
    const tree = createSyntaxTree('src:t' as any, root, 10);
    const cu = getCompilationUnit(tree);
    expect(cu.genes.length).toBe(2);
    expect(cu.genes[0]!.name).toBe('a');
    expect(cu.genes[1]!.name).toBe('b');
  });

  it('collects import declarations', () => {
    const imp = GreenNode.create(SyntaxKind.ImportDeclaration, [
      GreenToken.fromText(SyntaxKind.KeywordImport, 'import'),
      GreenToken.fromText(SyntaxKind.StringLiteral, '"pkg/mod"'),
    ]);
    const root = GreenNode.create(SyntaxKind.CompilationUnit, [imp]);
    const tree = createSyntaxTree('src:t' as any, root, 16);
    const cu = getCompilationUnit(tree);
    expect(cu.imports.length).toBe(1);
    expect(cu.imports[0]!.importKeyword).toBe('import');
    expect(cu.imports[0]!.path).toBe('"pkg/mod"');
  });
});

describe('§10 SeedDeclarationSyntax', () => {
  it('accesses seed body children (genes, constraints, effects, budget)', () => {
    const seed = GreenToken.fromText(SyntaxKind.KeywordSeed, 'seed');
    const ver = GreenToken.fromText(SyntaxKind.FloatLiteral, '1.0');
    const geneNode = GreenNode.create(SyntaxKind.GeneDeclaration, [
      GreenToken.fromText(SyntaxKind.KeywordGene, 'gene'),
      GreenToken.fromText(SyntaxKind.Identifier, 'x'),
    ]);
    const constraintBlock = GreenNode.create(SyntaxKind.ConstraintBlock, [
      GreenToken.fromText(SyntaxKind.KeywordConstraints, 'constraint'),
    ]);
    const effectsBlock = GreenNode.create(SyntaxKind.EffectsBlock, [
      GreenToken.fromText(SyntaxKind.KeywordEffects, 'effects'),
    ]);
    const budgetBlock = GreenNode.create(SyntaxKind.BudgetBlock, [
      GreenToken.fromText(SyntaxKind.KeywordBudget, 'budget'),
    ]);
    const seedDecl = GreenNode.create(SyntaxKind.SeedDeclaration, [seed, ver, geneNode, constraintBlock, effectsBlock, budgetBlock]);
    const root = GreenNode.create(SyntaxKind.CompilationUnit, [seedDecl]);
    const tree = createSyntaxTree('src:t' as any, root, 100);
    const cu = getCompilationUnit(tree);
    const sd = cu.seedDeclaration!;
    expect(sd.seedKeyword).toBe('seed');
    expect(sd.versionLiteral).toBe('1.0');
    expect(sd.genes.length).toBe(1);
    expect(sd.genes[0]!.name).toBe('x');
    expect(sd.constraints).toBeDefined();
    expect(sd.constraints!.kind).toBe(SyntaxKind.ConstraintBlock);
    expect(sd.effects).toBeDefined();
    expect(sd.effects!.kind).toBe(SyntaxKind.EffectsBlock);
    expect(sd.budget).toBeDefined();
    expect(sd.budget!.kind).toBe(SyntaxKind.BudgetBlock);
  });
});

describe('§10 GeneDeclarationSyntax', () => {
  it('wraps a gene declaration with type and value', () => {
    const gene = GreenToken.fromText(SyntaxKind.KeywordGene, 'gene');
    const name = GreenToken.fromText(SyntaxKind.Identifier, 'health');
    const colon = GreenToken.fromText(SyntaxKind.Colon, ':');
    const typeId = GreenToken.fromText(SyntaxKind.Identifier, 'scalar');
    const typeExpr = GreenNode.create(SyntaxKind.TypeExpression, [typeId]);
    const eq = GreenToken.fromText(SyntaxKind.Assign, '=');
    const valTok = GreenToken.fromText(SyntaxKind.IntegerLiteral, '100');
    const valExpr = GreenNode.create(SyntaxKind.Expression, [valTok]);
    const geneNode = GreenNode.create(SyntaxKind.GeneDeclaration, [gene, name, colon, typeExpr, eq, valExpr]);
    const root = GreenNode.create(SyntaxKind.CompilationUnit, [geneNode]);
    const tree = createSyntaxTree('src:t' as any, root, 100);
    const cu = getCompilationUnit(tree);
    const genes = cu.genes;
    expect(genes.length).toBe(1);
    expect(genes[0]!.name).toBe('health');
    expect(genes[0]!.hasTypeAnnotation).toBe(true);
    expect(genes[0]!.typeExpression!.typeName).toBe('scalar');
    expect(genes[0]!.hasValue).toBe(true);
    expect(genes[0]!.value!.isLiteral).toBe(true);
    expect(genes[0]!.value!.literalText).toBe('100');
  });

  it('handles private gene', () => {
    const priv = GreenToken.fromText(SyntaxKind.KeywordPrivate, 'private');
    const gene = GreenToken.fromText(SyntaxKind.KeywordGene, 'gene');
    const name = GreenToken.fromText(SyntaxKind.Identifier, 'temp');
    const geneNode = GreenNode.create(SyntaxKind.GeneDeclaration, [priv, gene, name]);
    const root = GreenNode.create(SyntaxKind.CompilationUnit, [geneNode]);
    const tree = createSyntaxTree('src:t' as any, root, 100);
    const cu = getCompilationUnit(tree);
    expect(cu.genes.length).toBe(1);
    expect(cu.genes[0]!.isPrivate).toBe(true);
    expect(cu.genes[0]!.name).toBe('temp');
  });

  it('handles gene without type annotation or value', () => {
    const gene = GreenToken.fromText(SyntaxKind.KeywordGene, 'gene');
    const name = GreenToken.fromText(SyntaxKind.Identifier, 'speed');
    const geneNode = GreenNode.create(SyntaxKind.GeneDeclaration, [gene, name]);
    const root = GreenNode.create(SyntaxKind.CompilationUnit, [geneNode]);
    const tree = createSyntaxTree('src:t' as any, root, 100);
    const cu = getCompilationUnit(tree);
    expect(cu.genes[0]!.hasTypeAnnotation).toBe(false);
    expect(cu.genes[0]!.typeExpression).toBeUndefined();
    expect(cu.genes[0]!.hasValue).toBe(false);
    expect(cu.genes[0]!.value).toBeUndefined();
  });
});

describe('§10 ImportDeclarationSyntax', () => {
  it('wraps import with alias', () => {
    const imp = GreenNode.create(SyntaxKind.ImportDeclaration, [
      GreenToken.fromText(SyntaxKind.KeywordImport, 'import'),
      GreenToken.fromText(SyntaxKind.StringLiteral, '"pkg/mod"'),
      GreenToken.fromText(SyntaxKind.KeywordAs, 'as'),
      GreenToken.fromText(SyntaxKind.Identifier, 'mod'),
    ]);
    const root = GreenNode.create(SyntaxKind.CompilationUnit, [imp]);
    const tree = createSyntaxTree('src:t' as any, root, 24);
    const cu = getCompilationUnit(tree);
    const impAcc = cu.imports[0]!;
    expect(impAcc.hasAlias).toBe(true);
    expect(impAcc.alias).toBe('mod');
  });

  it('handles import without alias', () => {
    const imp = GreenNode.create(SyntaxKind.ImportDeclaration, [
      GreenToken.fromText(SyntaxKind.KeywordImport, 'import'),
      GreenToken.fromText(SyntaxKind.StringLiteral, '"pkg/mod"'),
    ]);
    const root = GreenNode.create(SyntaxKind.CompilationUnit, [imp]);
    const tree = createSyntaxTree('src:t' as any, root, 16);
    const cu = getCompilationUnit(tree);
    expect(cu.imports[0]!.hasAlias).toBe(false);
    expect(cu.imports[0]!.alias).toBeUndefined();
  });
});

describe('§10 ExportDeclarationSyntax', () => {
  it('collects exported names', () => {
    const exp = GreenNode.create(SyntaxKind.ExportDeclaration, [
      GreenToken.fromText(SyntaxKind.KeywordExport, 'export'),
      GreenToken.fromText(SyntaxKind.Identifier, 'foo'),
      GreenToken.fromText(SyntaxKind.Identifier, 'bar'),
    ]);
    const root = GreenNode.create(SyntaxKind.CompilationUnit, [exp]);
    const tree = createSyntaxTree('src:t' as any, root, 13);
    const cu = getCompilationUnit(tree);
    const expNode = findChild(tree.root, SyntaxKind.ExportDeclaration)!;
    const expAcc = new ExportDeclarationSyntax(expNode);
    expect(expAcc.exportKeyword).toBe('export');
    expect(expAcc.exportedNames).toEqual(['foo', 'bar']);
  });
});

describe('§10 ExpressionSyntax', () => {
  it('identifies literal expression', () => {
    const tok = GreenToken.fromText(SyntaxKind.IntegerLiteral, '42');
    const expr = GreenNode.create(SyntaxKind.Expression, [tok]);
    const root = GreenNode.create(SyntaxKind.CompilationUnit, [expr]);
    const tree = createSyntaxTree('src:t' as any, root, 2);
    const exprRed = findChild(tree.root, SyntaxKind.Expression)!;
    const es = new ExpressionSyntax(exprRed);
    expect(es.isLiteral).toBe(true);
    expect(es.literalText).toBe('42');
  });

  it('identifies binary expression', () => {
    const left = GreenNode.create(SyntaxKind.Expression, [GreenToken.fromText(SyntaxKind.IntegerLiteral, '1')]);
    const op = GreenToken.fromText(SyntaxKind.Plus, '+');
    const right = GreenNode.create(SyntaxKind.Expression, [GreenToken.fromText(SyntaxKind.IntegerLiteral, '2')]);
    const binExpr = GreenNode.create(SyntaxKind.Expression, [left, op, right]);
    const root = GreenNode.create(SyntaxKind.CompilationUnit, [binExpr]);
    const tree = createSyntaxTree('src:t' as any, root, 3);
    const exprRed = findChild(tree.root, SyntaxKind.Expression)!;
    const es = new ExpressionSyntax(exprRed);
    expect(es.isBinary).toBe(true);
    expect(es.binaryOperator).toBe('+');
    expect(es.binaryLeft!.literalText).toBe('1');
    expect(es.binaryRight!.literalText).toBe('2');
  });

  it('identifies unary expression', () => {
    const op = GreenToken.fromText(SyntaxKind.Minus, '-');
    const operand = GreenNode.create(SyntaxKind.Expression, [GreenToken.fromText(SyntaxKind.IntegerLiteral, '42')]);
    const unaryExpr = GreenNode.create(SyntaxKind.Expression, [op, operand]);
    const root = GreenNode.create(SyntaxKind.CompilationUnit, [unaryExpr]);
    const tree = createSyntaxTree('src:t' as any, root, 3);
    const exprRed = findChild(tree.root, SyntaxKind.Expression)!;
    const es = new ExpressionSyntax(exprRed);
    expect(es.isUnary).toBe(true);
    expect(es.unaryOperator).toBe('-');
    expect(es.unaryOperand!.literalText).toBe('42');
  });

  it('identifies list expression', () => {
    const lb = GreenToken.fromText(SyntaxKind.LeftBracket, '[');
    const rb = GreenToken.fromText(SyntaxKind.RightBracket, ']');
    const listExpr = GreenNode.create(SyntaxKind.Expression, [lb, rb]);
    const root = GreenNode.create(SyntaxKind.CompilationUnit, [listExpr]);
    const tree = createSyntaxTree('src:t' as any, root, 2);
    const exprRed = findChild(tree.root, SyntaxKind.Expression)!;
    const es = new ExpressionSyntax(exprRed);
    expect(es.isList).toBe(true);
  });

  it('identifies record expression', () => {
    const lb = GreenToken.fromText(SyntaxKind.LeftBrace, '{');
    const rb = GreenToken.fromText(SyntaxKind.RightBrace, '}');
    const recExpr = GreenNode.create(SyntaxKind.Expression, [lb, rb]);
    const root = GreenNode.create(SyntaxKind.CompilationUnit, [recExpr]);
    const tree = createSyntaxTree('src:t' as any, root, 2);
    const exprRed = findChild(tree.root, SyntaxKind.Expression)!;
    const es = new ExpressionSyntax(exprRed);
    expect(es.isRecord).toBe(true);
  });

  it('identifies parenthesized expression', () => {
    const lp = GreenToken.fromText(SyntaxKind.LeftParen, '(');
    const rp = GreenToken.fromText(SyntaxKind.RightParen, ')');
    const parenExpr = GreenNode.create(SyntaxKind.Expression, [lp, rp]);
    const root = GreenNode.create(SyntaxKind.CompilationUnit, [parenExpr]);
    const tree = createSyntaxTree('src:t' as any, root, 2);
    const exprRed = findChild(tree.root, SyntaxKind.Expression)!;
    const es = new ExpressionSyntax(exprRed);
    expect(es.isParenthesized).toBe(true);
  });
});

describe('§10 TypeExpressionSyntax', () => {
  it('identifies named type', () => {
    const typeId = GreenToken.fromText(SyntaxKind.Identifier, 'scalar');
    const te = GreenNode.create(SyntaxKind.TypeExpression, [typeId]);
    const root = GreenNode.create(SyntaxKind.CompilationUnit, [te]);
    const tree = createSyntaxTree('src:t' as any, root, 6);
    const teRed = findChild(tree.root, SyntaxKind.TypeExpression)!;
    const ts = new TypeExpressionSyntax(teRed);
    expect(ts.isNamedType).toBe(true);
    expect(ts.typeName).toBe('scalar');
  });

  it('identifies optional type', () => {
    const typeId = GreenToken.fromText(SyntaxKind.Identifier, 'scalar');
    const q = GreenToken.fromText(SyntaxKind.Question, '?');
    const te = GreenNode.create(SyntaxKind.TypeExpression, [typeId, q]);
    const root = GreenNode.create(SyntaxKind.CompilationUnit, [te]);
    const tree = createSyntaxTree('src:t' as any, root, 7);
    const teRed = findChild(tree.root, SyntaxKind.TypeExpression)!;
    const ts = new TypeExpressionSyntax(teRed);
    expect(ts.isOptional).toBe(true);
    expect(ts.isNamedType).toBe(true);
  });

  it('identifies list type', () => {
    const lb = GreenToken.fromText(SyntaxKind.LeftBracket, '[');
    const inner = GreenNode.create(SyntaxKind.TypeExpression, [GreenToken.fromText(SyntaxKind.Identifier, 'scalar')]);
    const rb = GreenToken.fromText(SyntaxKind.RightBracket, ']');
    const te = GreenNode.create(SyntaxKind.TypeExpression, [lb, inner, rb]);
    const root = GreenNode.create(SyntaxKind.CompilationUnit, [te]);
    const tree = createSyntaxTree('src:t' as any, root, 9);
    const teRed = findChild(tree.root, SyntaxKind.TypeExpression)!;
    const ts = new TypeExpressionSyntax(teRed);
    expect(ts.isListType).toBe(true);
  });

  it('identifies map type', () => {
    const lb = GreenToken.fromText(SyntaxKind.LeftBrace, '{');
    const inner = GreenNode.create(SyntaxKind.TypeExpression, [GreenToken.fromText(SyntaxKind.Identifier, 'scalar')]);
    const rb = GreenToken.fromText(SyntaxKind.RightBrace, '}');
    const te = GreenNode.create(SyntaxKind.TypeExpression, [lb, inner, rb]);
    const root = GreenNode.create(SyntaxKind.CompilationUnit, [te]);
    const tree = createSyntaxTree('src:t' as any, root, 9);
    const teRed = findChild(tree.root, SyntaxKind.TypeExpression)!;
    const ts = new TypeExpressionSyntax(teRed);
    expect(ts.isMapType).toBe(true);
  });
});
