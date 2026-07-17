/**
 * CST → AST lowering pass.
 * Prompt 3 §11.
 *
 * Walks the parsed SyntaxTree (lossless CST) and constructs typed AST nodes.
 * The AST is a semantic projection — no trivia, no malformed tokens.
 * Missing/invalid values are represented explicitly, not silently dropped.
 */
import { SyntaxKind, isRedNode, isRedToken, type RedNode, type RedChild, type RedToken, type SyntaxTree } from '@gspl/syntax-tree';
import type { Diagnostic, SourceSpan } from '@gspl/text-source';
import { makeDiagnostic } from '@gspl/text-source';
import type {
  AstNodeId, SyntaxReference, AnyAstNode,
  ProgramNode, ImportDeclNode, ExportDeclNode, SeedDeclNode, GeneDeclNode,
  ConstraintBlockNode, EntropyBlockNode, EffectsBlockNode, BudgetBlockNode,
  TargetDeclNode, ExtensionDeclNode, SimpleClauseNode,
  TypeNode, NamedTypeNode, ListTypeNode, MapTypeNode, OptionalTypeNode,
  ExprNode, LiteralExprNode, IdentifierExprNode, BinaryExprNode, UnaryExprNode,
  ListExprNode, RecordExprNode, ErrorNode,
  AstLoweringResult,
} from './ast-types.js';
import { AstKind } from './ast-types.js';

// ============================================================
// ID generator — deterministic within a compilation
// ============================================================

class IdGenerator {
  private next = 0;
  nextId(): AstNodeId { return this.next++ as AstNodeId; }
}

// ============================================================
// Helpers
// ============================================================

function tokenText(child: RedChild | undefined): string {
  if (child && isRedToken(child)) return child.text;
  return '';
}

function tokenKind(child: RedChild | undefined): SyntaxKind | undefined {
  if (child && isRedToken(child)) return child.kind;
  return undefined;
}

function asRedNode(child: RedChild | undefined): RedNode | undefined {
  if (child && isRedNode(child)) return child;
  return undefined;
}

function asRedToken(child: RedChild | undefined): RedToken | undefined {
  if (child && isRedToken(child)) return child;
  return undefined;
}

function makeSyntaxRef(node: RedNode): SyntaxReference {
  return { kind: node.kind, span: node.span };
}

// ============================================================
// Lowering context
// ============================================================

class LoweringContext {
  readonly ids = new IdGenerator();
  readonly diagnostics: Diagnostic[] = [];
  readonly sourceId: string;
  nodeCount = 0;

  constructor(sourceId: string) {
    this.sourceId = sourceId;
  }

  emitDiagnostic(code: string, message: string, start: number, end: number): void {
    this.diagnostics.push(makeDiagnostic({
      code, message, severity: 'error',
      span: { sourceId: this.sourceId as any, start, end },
      category: 'lower', phase: 'lower', canonical: true,
    }));
  }

  trackNode(): void { this.nodeCount++; }
}

// ============================================================
// Type lowering
// ============================================================

function lowerType(node: RedNode, ctx: LoweringContext): TypeNode {
  ctx.trackNode();
  const children = node.children;
  const first = children[0];

  // [Type] — list type
  if (tokenKind(first) === SyntaxKind.LeftBracket) {
    const innerNode = asRedNode(children[1]);
    if (innerNode && innerNode.kind === SyntaxKind.TypeExpression) {
      const inner = lowerType(innerNode, ctx);
      return {
        kind: AstKind.ListType,
        id: ctx.ids.nextId(),
        syntax: makeSyntaxRef(node),
        span: node.span,
        elementType: inner,
      } as ListTypeNode;
    }
    // Empty or malformed — create a named type placeholder
    ctx.emitDiagnostic('GSPL-LOWER-INVALID-TYPE', 'malformed list type', node.span.start, node.span.end);
    return {
      kind: AstKind.NamedType,
      id: ctx.ids.nextId(),
      syntax: makeSyntaxRef(node),
      span: node.span,
      name: '',
    } as NamedTypeNode;
  }

  // { field: Type, ... } — map/record type
  if (tokenKind(first) === SyntaxKind.LeftBrace) {
    const fields: { name: string; type: TypeNode }[] = [];
    for (let i = 1; i < children.length - 1; i++) {
      const nameTok = asRedToken(children[i]);
      if (nameTok && nameTok.kind === SyntaxKind.Identifier) {
        const colon = asRedToken(children[i + 1]);
        if (colon && colon.kind === SyntaxKind.Colon) {
          const typeNode = asRedNode(children[i + 2]);
          if (typeNode && typeNode.kind === SyntaxKind.TypeExpression) {
            fields.push({ name: nameTok.text, type: lowerType(typeNode, ctx) });
            i += 2; // skip colon and type
          }
        }
      }
    }
    return {
      kind: AstKind.MapType,
      id: ctx.ids.nextId(),
      syntax: makeSyntaxRef(node),
      span: node.span,
      fields,
    } as MapTypeNode;
  }

  // Named type (identifier)
  const nameTok = asRedToken(first);
  const name = nameTok ? nameTok.text : '';
  const named: NamedTypeNode = {
    kind: AstKind.NamedType,
    id: ctx.ids.nextId(),
    syntax: makeSyntaxRef(node),
    span: node.span,
    name,
  };

  // Optional? — check last child for Question
  const last = children[children.length - 1];
  if (tokenKind(last) === SyntaxKind.Question) {
    return {
      kind: AstKind.OptionalType,
      id: ctx.ids.nextId(),
      syntax: makeSyntaxRef(node),
      span: node.span,
      inner: named,
    } as OptionalTypeNode;
  }

  return named;
}

// ============================================================
// Expression lowering
// ============================================================

function lowerExpression(node: RedNode, ctx: LoweringContext): ExprNode {
  ctx.trackNode();
  const children = node.children;
  const childCount = children.length;

  // Literal — single token
  if (childCount === 1) {
    const tok = asRedToken(children[0]);
    if (tok) {
      const literalKind = literalKindFromToken(tok.kind);
      if (literalKind) {
        return {
          kind: AstKind.LiteralExpr,
          id: ctx.ids.nextId(),
          syntax: makeSyntaxRef(node),
          span: node.span,
          literalKind,
          value: tok.text,
        } as LiteralExprNode;
      }
      // Identifier reference
      if (tok.kind === SyntaxKind.Identifier) {
        return {
          kind: AstKind.IdentifierExpr,
          id: ctx.ids.nextId(),
          syntax: makeSyntaxRef(node),
          span: node.span,
          name: tok.text,
        } as IdentifierExprNode;
      }
    }
  }

  // Binary — [Expr, OpToken, Expr]
  if (childCount === 3) {
    const leftNode = asRedNode(children[0]);
    const opTok = asRedToken(children[1]);
    const rightNode = asRedNode(children[2]);
    if (leftNode && opTok && rightNode &&
        leftNode.kind === SyntaxKind.Expression && rightNode.kind === SyntaxKind.Expression) {
      return {
        kind: AstKind.BinaryExpr,
        id: ctx.ids.nextId(),
        syntax: makeSyntaxRef(node),
        span: node.span,
        operator: opTok.text,
        left: lowerExpression(leftNode, ctx),
        right: lowerExpression(rightNode, ctx),
      } as BinaryExprNode;
    }
  }

  // Unary — [OpToken, Expr]
  if (childCount === 2) {
    const opTok = asRedToken(children[0]);
    const operandNode = asRedNode(children[1]);
    if (opTok && operandNode && operandNode.kind === SyntaxKind.Expression) {
      return {
        kind: AstKind.UnaryExpr,
        id: ctx.ids.nextId(),
        syntax: makeSyntaxRef(node),
        span: node.span,
        operator: opTok.text,
        operand: lowerExpression(operandNode, ctx),
      } as UnaryExprNode;
    }
  }

  // Parenthesized — ( expr ) — parentheses are semantically transparent
  const firstTok = asRedToken(children[0]);
  if (firstTok && firstTok.kind === SyntaxKind.LeftParen) {
    // Find the inner expression node (skip LeftParen and RightParen)
    for (let i = 1; i < children.length - 1; i++) {
      const innerNode = asRedNode(children[i]);
      if (innerNode && innerNode.kind === SyntaxKind.Expression) {
        return lowerExpression(innerNode, ctx);
      }
    }
    // Empty parens — error
    ctx.emitDiagnostic('GSPL-LOWER-INVALID-EXPR', 'empty parenthesized expression', node.span.start, node.span.end);
    return {
      kind: AstKind.LiteralExpr,
      id: ctx.ids.nextId(),
      syntax: makeSyntaxRef(node),
      span: node.span,
      literalKind: 'string',
      value: '',
    } as LiteralExprNode;
  }

  // List — starts with [
  if (firstTok && firstTok.kind === SyntaxKind.LeftBracket) {
    const elements: ExprNode[] = [];
    for (let i = 1; i < children.length - 1; i++) {
      const child = asRedNode(children[i]);
      if (child && child.kind === SyntaxKind.Expression) {
        elements.push(lowerExpression(child, ctx));
      }
    }
    return {
      kind: AstKind.ListExpr,
      id: ctx.ids.nextId(),
      syntax: makeSyntaxRef(node),
      span: node.span,
      elements,
    } as ListExprNode;
  }

  // Record — starts with {
  if (firstTok && firstTok.kind === SyntaxKind.LeftBrace) {
    const fields: { name: string; value: ExprNode }[] = [];
    for (let i = 1; i < children.length - 1; i++) {
      const nameTok = asRedToken(children[i]);
      if (nameTok && nameTok.kind === SyntaxKind.Identifier) {
        const colon = asRedToken(children[i + 1]);
        if (colon && colon.kind === SyntaxKind.Colon) {
          const valNode = asRedNode(children[i + 2]);
          if (valNode && valNode.kind === SyntaxKind.Expression) {
            fields.push({ name: nameTok.text, value: lowerExpression(valNode, ctx) });
            i += 2;
          }
        }
      }
    }
    return {
      kind: AstKind.RecordExpr,
      id: ctx.ids.nextId(),
      syntax: makeSyntaxRef(node),
      span: node.span,
      fields,
    } as RecordExprNode;
  }

  // Fallback — error node wrapped as expression
  ctx.emitDiagnostic('GSPL-LOWER-INVALID-EXPR', 'cannot lower expression node', node.span.start, node.span.end);
  return {
    kind: AstKind.LiteralExpr,
    id: ctx.ids.nextId(),
    syntax: makeSyntaxRef(node),
    span: node.span,
    literalKind: 'string',
    value: '',
  } as LiteralExprNode;
}

function literalKindFromToken(kind: SyntaxKind): 'integer' | 'float' | 'string' | 'boolean' | 'absence' | undefined {
  switch (kind) {
    case SyntaxKind.IntegerLiteral: return 'integer';
    case SyntaxKind.FloatLiteral: return 'float';
    case SyntaxKind.StringLiteral:
    case SyntaxKind.RawStringLiteral:
    case SyntaxKind.MultilineStringLiteral: return 'string';
    case SyntaxKind.KeywordTrue:
    case SyntaxKind.KeywordFalse: return 'boolean';
    case SyntaxKind.KeywordNone: return 'absence';
    default: return undefined;
  }
}

// ============================================================
// Declaration lowering
// ============================================================

function lowerImportDecl(node: RedNode, ctx: LoweringContext): ImportDeclNode {
  ctx.trackNode();
  const children = node.children;
  const pathTok = asRedToken(children[1]);
  let path = pathTok ? pathTok.text : '';
  // Strip surrounding quotes from string literals ("..." → ...)
  if ((path.startsWith('"') && path.endsWith('"')) || (path.startsWith("'") && path.endsWith("'"))) {
    path = path.slice(1, -1);
  }

  // Check for `as` alias
  let alias: string | undefined;
  const asTok = children.find(c => tokenKind(c) === SyntaxKind.KeywordAs);
  if (asTok) {
    const idx = children.indexOf(asTok);
    const aliasTok = asRedToken(children[idx + 1]);
    alias = aliasTok ? aliasTok.text : undefined;
  }

  return {
    kind: AstKind.ImportDecl,
    id: ctx.ids.nextId(),
    syntax: makeSyntaxRef(node),
    span: node.span,
    path,
    alias,
  };
}

function lowerExportDecl(node: RedNode, ctx: LoweringContext): ExportDeclNode {
  ctx.trackNode();
  const names: string[] = [];
  for (const child of node.children) {
    const tok = asRedToken(child);
    if (tok && tok.kind === SyntaxKind.Identifier) {
      names.push(tok.text);
    }
  }
  return {
    kind: AstKind.ExportDecl,
    id: ctx.ids.nextId(),
    syntax: makeSyntaxRef(node),
    span: node.span,
    names,
  };
}

function lowerGeneDecl(node: RedNode, ctx: LoweringContext): GeneDeclNode {
  ctx.trackNode();
  let offset = 0;
  const children = node.children;

  // Check for private
  const isPrivate = tokenKind(children[0]) === SyntaxKind.KeywordPrivate;
  if (isPrivate) offset = 1;

  // gene keyword
  offset++; // skip gene keyword
  const nameTok = asRedToken(children[offset]);
  const name = nameTok ? nameTok.text : '';
  offset++;

  // Type annotation?
  let typeAnnotation: TypeNode | undefined;
  if (tokenKind(children[offset]) === SyntaxKind.Colon) {
    offset++; // skip colon
    const typeNode = asRedNode(children[offset]);
    if (typeNode && typeNode.kind === SyntaxKind.TypeExpression) {
      typeAnnotation = lowerType(typeNode, ctx);
    }
    offset++;
  }

  // Value?
  let value: ExprNode | undefined;
  if (tokenKind(children[offset]) === SyntaxKind.Assign) {
    offset++; // skip =
    const exprNode = asRedNode(children[offset]);
    if (exprNode && exprNode.kind === SyntaxKind.Expression) {
      value = lowerExpression(exprNode, ctx);
    }
    offset++;
  }

  // Confidence?
  let confidence: number | undefined;
  if (tokenKind(children[offset]) === SyntaxKind.KeywordConfidence) {
    offset++; // skip confidence keyword
    const confTok = asRedToken(children[offset]);
    if (confTok) {
      const parsed = parseFloat(confTok.text);
      if (!isNaN(parsed)) confidence = parsed;
    }
  }

  return {
    kind: AstKind.GeneDecl,
    id: ctx.ids.nextId(),
    syntax: makeSyntaxRef(node),
    span: node.span,
    isPrivate,
    name,
    typeAnnotation,
    value,
    confidence,
  };
}

function lowerSimpleClause(node: RedNode, ctx: LoweringContext): SimpleClauseNode {
  ctx.trackNode();
  const children = node.children;
  const kwTok = asRedToken(children[0]);
  const keyword = kwTok ? kwTok.text : '';
  const valTok = asRedToken(children[1]);
  const value = valTok ? valTok.text : undefined;

  return {
    kind: AstKind.SimpleClause,
    id: ctx.ids.nextId(),
    syntax: makeSyntaxRef(node),
    span: node.span,
    keyword,
    value,
  };
}

function lowerBlockChildren(blockChildren: readonly RedChild[], ctx: LoweringContext): SimpleClauseNode[] {
  const clauses: SimpleClauseNode[] = [];
  for (const child of blockChildren) {
    const node = asRedNode(child);
    if (node && node.kind === SyntaxKind.Block) {
      clauses.push(lowerSimpleClause(node, ctx));
    }
  }
  return clauses;
}

function lowerSeedDecl(node: RedNode, ctx: LoweringContext): SeedDeclNode {
  ctx.trackNode();
  const children = node.children;

  // children[0] = 'seed' keyword
  // children[1] = version literal (if present)
  const verTok = asRedToken(children[1]);
  const version = verTok ? verTok.text : undefined;

  // Remaining children after seed + version
  const bodyChildren = children.slice(2);

  const clauses: SimpleClauseNode[] = [];
  const genes: GeneDeclNode[] = [];
  let constraints: ConstraintBlockNode | undefined;
  let entropy: EntropyBlockNode | undefined;
  let effects: EffectsBlockNode | undefined;
  let budget: BudgetBlockNode | undefined;
  const targets: TargetDeclNode[] = [];
  const extensions: ExtensionDeclNode[] = [];

  for (const child of bodyChildren) {
    const childNode = asRedNode(child);
    if (!childNode) continue;

    switch (childNode.kind) {
      case SyntaxKind.Block:
        clauses.push(lowerSimpleClause(childNode, ctx));
        break;
      case SyntaxKind.GeneDeclaration:
        genes.push(lowerGeneDecl(childNode, ctx));
        break;
      case SyntaxKind.ConstraintBlock:
        ctx.trackNode();
        constraints = {
          kind: AstKind.ConstraintBlock,
          id: ctx.ids.nextId(),
          syntax: makeSyntaxRef(childNode),
          span: childNode.span,
          clauses: lowerBlockChildren(childNode.children.slice(1), ctx),
        };
        break;
      case SyntaxKind.EntropyBlock:
        ctx.trackNode();
        entropy = {
          kind: AstKind.EntropyBlock,
          id: ctx.ids.nextId(),
          syntax: makeSyntaxRef(childNode),
          span: childNode.span,
          clauses: lowerBlockChildren(childNode.children.slice(1), ctx),
        };
        break;
      case SyntaxKind.EffectsBlock:
        ctx.trackNode();
        effects = {
          kind: AstKind.EffectsBlock,
          id: ctx.ids.nextId(),
          syntax: makeSyntaxRef(childNode),
          span: childNode.span,
          clauses: lowerBlockChildren(childNode.children.slice(1), ctx),
        };
        break;
      case SyntaxKind.BudgetBlock:
        ctx.trackNode();
        budget = {
          kind: AstKind.BudgetBlock,
          id: ctx.ids.nextId(),
          syntax: makeSyntaxRef(childNode),
          span: childNode.span,
          clauses: lowerBlockChildren(childNode.children.slice(1), ctx),
        };
        break;
      case SyntaxKind.TargetDeclaration:
        targets.push(lowerTargetDecl(childNode, ctx));
        break;
      case SyntaxKind.ExtensionDeclaration:
        extensions.push(lowerExtensionDecl(childNode, ctx));
        break;
      default:
        // Skip unknown children
        break;
    }
  }

  return {
    kind: AstKind.SeedDecl,
    id: ctx.ids.nextId(),
    syntax: makeSyntaxRef(node),
    span: node.span,
    version,
    clauses,
    genes,
    constraints,
    entropy,
    effects,
    budget,
    targets,
    extensions,
  };
}

function lowerTargetDecl(node: RedNode, ctx: LoweringContext): TargetDeclNode {
  ctx.trackNode();
  const children = node.children;
  const nameTok = asRedToken(children[1]);
  const name = nameTok ? nameTok.text : undefined;

  let targetType: string | undefined;
  let idx = 2;
  if (tokenKind(children[idx]) === SyntaxKind.Colon) {
    idx++;
    const typeTok = asRedToken(children[idx]);
    targetType = typeTok ? typeTok.text : undefined;
    idx++;
  }

  const clauses: SimpleClauseNode[] = [];
  for (let i = idx; i < children.length; i++) {
    const childNode = asRedNode(children[i]);
    if (childNode && childNode.kind === SyntaxKind.Block) {
      clauses.push(lowerSimpleClause(childNode, ctx));
    }
  }

  return {
    kind: AstKind.TargetDecl,
    id: ctx.ids.nextId(),
    syntax: makeSyntaxRef(node),
    span: node.span,
    name,
    targetType,
    clauses,
  };
}

function lowerExtensionDecl(node: RedNode, ctx: LoweringContext): ExtensionDeclNode {
  ctx.trackNode();
  const children = node.children;
  const nameTok = asRedToken(children[1]);
  const name = nameTok ? nameTok.text : undefined;

  const params: { name: string; type: TypeNode | undefined }[] = [];
  let returnType: TypeNode | undefined;
  let value: ExprNode | undefined;

  // Find parameter list (paren)
  for (let i = 2; i < children.length; i++) {
    const child = children[i];
    if (tokenKind(child) === SyntaxKind.LeftParen) {
      // Parse params until RightParen
      i++;
      while (i < children.length && tokenKind(children[i]) !== SyntaxKind.RightParen) {
        const pNameTok = asRedToken(children[i]);
        if (pNameTok && pNameTok.kind === SyntaxKind.Identifier) {
          let pType: TypeNode | undefined;
          if (tokenKind(children[i + 1]) === SyntaxKind.Colon) {
            const typeNode = asRedNode(children[i + 2]);
            if (typeNode && typeNode.kind === SyntaxKind.TypeExpression) {
              pType = lowerType(typeNode, ctx);
              i += 2;
            }
          }
          params.push({ name: pNameTok.text, type: pType });
        }
        i++; // skip comma or current
      }
    } else if (tokenKind(child) === SyntaxKind.Colon) {
      // Return type
      const typeNode = asRedNode(children[i + 1]);
      if (typeNode && typeNode.kind === SyntaxKind.TypeExpression) {
        returnType = lowerType(typeNode, ctx);
        i++;
      }
    } else if (tokenKind(child) === SyntaxKind.Assign) {
      // Value expression
      const exprNode = asRedNode(children[i + 1]);
      if (exprNode && exprNode.kind === SyntaxKind.Expression) {
        value = lowerExpression(exprNode, ctx);
        i++;
      }
    }
  }

  return {
    kind: AstKind.ExtensionDecl,
    id: ctx.ids.nextId(),
    syntax: makeSyntaxRef(node),
    span: node.span,
    name,
    parameters: params,
    returnType,
    value,
  };
}

// ============================================================
// Program lowering — top-level entry
// ============================================================

/** Lower CST to AST, merging parser diagnostics if provided. */
export function lowerToAst(tree: SyntaxTree, languageVersion: string, parserDiagnostics: readonly Diagnostic[] = []): AstLoweringResult {
  const ctx = new LoweringContext(tree.sourceId);
  const root = tree.root;

  const imports: ImportDeclNode[] = [];
  const exports: ExportDeclNode[] = [];
  let seed: SeedDeclNode | undefined;
  const topLevelGenes: GeneDeclNode[] = [];

  for (const child of root.children) {
    const node = asRedNode(child);
    if (!node) continue;

    switch (node.kind) {
      case SyntaxKind.ImportDeclaration:
        imports.push(lowerImportDecl(node, ctx));
        break;
      case SyntaxKind.ExportDeclaration:
        exports.push(lowerExportDecl(node, ctx));
        break;
      case SyntaxKind.SeedDeclaration:
        // Collect imports/exports from seed body before lowering
        for (const seedChild of node.children) {
          const sc = asRedNode(seedChild);
          if (!sc) continue;
          if (sc.kind === SyntaxKind.ImportDeclaration) {
            imports.push(lowerImportDecl(sc, ctx));
          } else if (sc.kind === SyntaxKind.ExportDeclaration) {
            exports.push(lowerExportDecl(sc, ctx));
          }
        }
        seed = lowerSeedDecl(node, ctx);
        break;
      case SyntaxKind.GeneDeclaration:
        topLevelGenes.push(lowerGeneDecl(node, ctx));
        break;
      default:
        break;
    }
  }

  const program: ProgramNode = {
    kind: AstKind.Program,
    id: ctx.ids.nextId(),
    syntax: makeSyntaxRef(root),
    span: root.span,
    languageVersion,
    imports,
    exports,
    seed,
    topLevelGenes,
  };

  // Merge parser diagnostics with lowering diagnostics, sorted deterministically
  const allDiag = [...parserDiagnostics, ...ctx.diagnostics];
  allDiag.sort((a, b) =>
    a.span.start - b.span.start ||
    a.span.end - b.span.end ||
    (a.severity === 'error' ? 0 : 1) - (b.severity === 'error' ? 0 : 1) ||
    a.code.localeCompare(b.code)
  );

  return {
    program,
    diagnostics: allDiag,
    nodeCount: ctx.nodeCount,
  };
}
