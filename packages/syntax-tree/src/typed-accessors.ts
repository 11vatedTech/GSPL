/**
 * Typed CST accessors -- typed wrapper classes around RedNode/RedToken.
 * Prompt 3 §10.
 *
 * Each accessor validates the expected SyntaxKind and provides type-safe
 * navigation to expected children. Missing children return undefined.
 * Malformed states are preserved -- accessors never throw for structural
 * errors, they return undefined or empty arrays.
 */
import { SyntaxKind } from './syntax-kind.js';
import { RedNode, RedToken, RedChild, isRedNode, isRedToken } from './red-node.js';
import type { SyntaxTree } from './red-node.js';


/** Base class for all typed CST accessors. */
export abstract class SyntaxNode {
  constructor(readonly node: RedNode) {}
  get kind(): SyntaxKind { return this.node.kind; }
  get span() { return this.node.span; }
  get isMissing(): boolean { return this.node.isMissing; }
  get childCount(): number { return this.node.childCount; }
  get children(): readonly RedChild[] { return this.node.children; }
}

/** Helper: get child at index as a RedNode, or undefined. */
function childNode(node: RedNode, index: number): RedNode | undefined {
  const child = node.childAt(index);
  if (child && isRedNode(child)) return child;
  return undefined;
}

/** Helper: get child at index as a RedToken, or undefined. */
function childToken(node: RedNode, index: number): RedToken | undefined {
  const child = node.childAt(index);
  if (child && isRedToken(child)) return child;
  return undefined;
}

/** Helper: get token text at index, or empty string. */
function tokenText(node: RedNode, index: number): string {
  const tok = childToken(node, index);
  return tok ? tok.text : '';
}

// ============================================================
// Declaration accessors
// ============================================================

export class CompilationUnitSyntax extends SyntaxNode {
  constructor(node: RedNode) {
    super(node);
    if (node.kind !== SyntaxKind.CompilationUnit) throw new Error(`Expected CompilationUnit, got kind=${node.kind}`);
  }

  /** Child declarations in source order. */
  get declarations(): readonly RedChild[] { return this.node.children; }

  /** First seed declaration, if present. */
  get seedDeclaration(): SeedDeclarationSyntax | undefined {
    for (const child of this.node.children) {
      if (isRedNode(child) && child.kind === SyntaxKind.SeedDeclaration) {
        return new SeedDeclarationSyntax(child);
      }
    }
    return undefined;
  }

  /** All import declarations. */
  get imports(): ImportDeclarationSyntax[] {
    const result: ImportDeclarationSyntax[] = [];
    for (const child of this.node.children) {
      if (isRedNode(child) && child.kind === SyntaxKind.ImportDeclaration) {
        result.push(new ImportDeclarationSyntax(child));
      }
    }
    return result;
  }

  /** All gene declarations (top-level or within seed). */
  get genes(): GeneDeclarationSyntax[] {
    const result: GeneDeclarationSyntax[] = [];
    for (const child of this.node.children) {
      if (isRedNode(child) && child.kind === SyntaxKind.GeneDeclaration) {
        result.push(new GeneDeclarationSyntax(child));
      }
    }
    return result;
  }
}

export class SeedDeclarationSyntax extends SyntaxNode {
  constructor(node: RedNode) {
    super(node);
    if (node.kind !== SyntaxKind.SeedDeclaration) throw new Error(`Expected SeedDeclaration, got kind=${node.kind}`);
  }

  get seedKeyword(): string { return tokenText(this.node, 0); }
  get versionLiteral(): string { return tokenText(this.node, 1); }
  get bodyChildren(): readonly RedChild[] { return this.node.children.slice(2); }

  get genes(): GeneDeclarationSyntax[] {
    const result: GeneDeclarationSyntax[] = [];
    for (const child of this.bodyChildren) {
      if (isRedNode(child) && child.kind === SyntaxKind.GeneDeclaration) {
        result.push(new GeneDeclarationSyntax(child));
      }
    }
    return result;
  }

  get constraints(): RedNode | undefined {
    for (const child of this.bodyChildren) {
      if (isRedNode(child) && child.kind === SyntaxKind.ConstraintBlock) return child;
    }
    return undefined;
  }

  get effects(): RedNode | undefined {
    for (const child of this.bodyChildren) {
      if (isRedNode(child) && child.kind === SyntaxKind.EffectsBlock) return child;
    }
    return undefined;
  }

  get budget(): RedNode | undefined {
    for (const child of this.bodyChildren) {
      if (isRedNode(child) && child.kind === SyntaxKind.BudgetBlock) return child;
    }
    return undefined;
  }
}

export class GeneDeclarationSyntax extends SyntaxNode {
  constructor(node: RedNode) {
    super(node);
    if (node.kind !== SyntaxKind.GeneDeclaration) throw new Error(`Expected GeneDeclaration, got kind=${node.kind}`);
  }

  get isPrivate(): boolean { return this.node.childAt(0) && isRedToken(this.node.childAt(0)!) && this.node.childAt(0)!.kind === SyntaxKind.KeywordPrivate || false; }

  get geneKeyword(): string {
    const offset = this.isPrivate ? 1 : 0;
    return tokenText(this.node, offset);
  }

  get name(): string {
    const offset = this.isPrivate ? 2 : 1;
    return tokenText(this.node, offset);
  }

  get hasTypeAnnotation(): boolean {
    const offset = this.isPrivate ? 3 : 2;
    const child = this.node.childAt(offset);
    return child !== undefined && isRedToken(child) && child.kind === SyntaxKind.Colon;
  }

  get typeExpression(): TypeExpressionSyntax | undefined {
    if (!this.hasTypeAnnotation) return undefined;
    const offset = this.isPrivate ? 4 : 3;
    const typeNode = childNode(this.node, offset);
    if (typeNode && typeNode.kind === SyntaxKind.TypeExpression) return new TypeExpressionSyntax(typeNode);
    return undefined;
  }

  get hasValue(): boolean {
    const offset = this.isPrivate ? 5 : 4;
    const child = this.node.childAt(offset);
    return child !== undefined && isRedToken(child) && child.kind === SyntaxKind.Assign;
  }

  get value(): ExpressionSyntax | undefined {
    if (!this.hasValue) return undefined;
    const offset = this.isPrivate ? 6 : 5;
    const exprNode = childNode(this.node, offset);
    if (exprNode && exprNode.kind === SyntaxKind.Expression) return new ExpressionSyntax(exprNode);
    return undefined;
  }
}

export class ImportDeclarationSyntax extends SyntaxNode {
  constructor(node: RedNode) {
    super(node);
    if (node.kind !== SyntaxKind.ImportDeclaration) throw new Error(`Expected ImportDeclaration, got kind=${node.kind}`);
  }
  get importKeyword(): string { return tokenText(this.node, 0); }
  get path(): string { return tokenText(this.node, 1); }
  get hasAlias(): boolean {
    const child = this.node.childAt(2);
    return child !== undefined && isRedToken(child) && child.kind === SyntaxKind.KeywordAs;
  }
  get alias(): string | undefined {
    if (!this.hasAlias) return undefined;
    return tokenText(this.node, 3);
  }
}

export class ExportDeclarationSyntax extends SyntaxNode {
  constructor(node: RedNode) {
    super(node);
    if (node.kind !== SyntaxKind.ExportDeclaration) throw new Error(`Expected ExportDeclaration, got kind=${node.kind}`);
  }
  get exportKeyword(): string { return tokenText(this.node, 0); }
  get exportedNames(): string[] {
    const names: string[] = [];
    for (const child of this.node.children) {
      if (isRedToken(child) && child.kind === SyntaxKind.Identifier) {
        names.push(child.text);
      }
    }
    return names;
  }
}

// ============================================================
// Expression and Type accessors
// ============================================================

export class ExpressionSyntax extends SyntaxNode {
  constructor(node: RedNode) {
    super(node);
    if (node.kind !== SyntaxKind.Expression) throw new Error(`Expected Expression, got kind=${node.kind}`);
  }

  get isLiteral(): boolean { return this.node.childCount === 1 && !!childToken(this.node, 0); }
  get literalText(): string | undefined { return this.isLiteral ? tokenText(this.node, 0) : undefined; }

  get isBinary(): boolean { return this.node.childCount === 3 && !!childNode(this.node, 0) && !!childToken(this.node, 1) && !!childNode(this.node, 2); }
  get binaryLeft(): ExpressionSyntax | undefined {
    if (!this.isBinary) return undefined;
    const left = childNode(this.node, 0);
    return left && left.kind === SyntaxKind.Expression ? new ExpressionSyntax(left) : undefined;
  }
  get binaryOperator(): string | undefined { return this.isBinary ? tokenText(this.node, 1) : undefined; }
  get binaryRight(): ExpressionSyntax | undefined {
    if (!this.isBinary) return undefined;
    const right = childNode(this.node, 2);
    return right && right.kind === SyntaxKind.Expression ? new ExpressionSyntax(right) : undefined;
  }

  get isUnary(): boolean { return this.node.childCount === 2 && !!childToken(this.node, 0) && !!childNode(this.node, 1); }
  get unaryOperator(): string | undefined { return this.isUnary ? tokenText(this.node, 0) : undefined; }
  get unaryOperand(): ExpressionSyntax | undefined {
    if (!this.isUnary) return undefined;
    const operand = childNode(this.node, 1);
    return operand && operand.kind === SyntaxKind.Expression ? new ExpressionSyntax(operand) : undefined;
  }

  get isList(): boolean { const first = this.node.childAt(0); return !!first && isRedToken(first) && first.kind === SyntaxKind.LeftBracket; }
  get isRecord(): boolean { const first = this.node.childAt(0); return !!first && isRedToken(first) && first.kind === SyntaxKind.LeftBrace; }
  get isParenthesized(): boolean { const first = this.node.childAt(0); return !!first && isRedToken(first) && first.kind === SyntaxKind.LeftParen; }
}

export class TypeExpressionSyntax extends SyntaxNode {
  constructor(node: RedNode) {
    super(node);
    if (node.kind !== SyntaxKind.TypeExpression) throw new Error(`Expected TypeExpression, got kind=${node.kind}`);
  }
  get isNamedType(): boolean { const first = this.node.childAt(0); return !!first && isRedToken(first) && first.kind === SyntaxKind.Identifier; }
  get typeName(): string | undefined { return this.isNamedType ? tokenText(this.node, 0) : undefined; }
  get isOptional(): boolean { const last = this.node.childAt(this.node.childCount - 1); return !!last && isRedToken(last) && last.kind === SyntaxKind.Question; }
  get isListType(): boolean { const first = this.node.childAt(0); return !!first && isRedToken(first) && first.kind === SyntaxKind.LeftBracket; }
  get isMapType(): boolean { const first = this.node.childAt(0); return !!first && isRedToken(first) && first.kind === SyntaxKind.LeftBrace; }
}

export function getCompilationUnit(tree: SyntaxTree): CompilationUnitSyntax {
  return new CompilationUnitSyntax(tree.root);
}
