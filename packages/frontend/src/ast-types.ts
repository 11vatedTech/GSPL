/**
 * Typed AST node definitions.
 * Prompt 3 §11.
 *
 * The AST is a semantic authoring projection — NOT a second lossless tree.
 * It is:
 *   - immutable
 *   - discriminated (by AstKind)
 *   - source-linked (via SyntaxReference)
 *   - provenance-linked
 *   - free of trivia
 *   - explicit about missing/invalid values
 *
 * The CST→AST lowering pass constructs these nodes from the parsed SyntaxTree.
 */
import type { SyntaxKind } from '@gspl/syntax-tree';
import type { SourceSpan, SourceId, Diagnostic } from '@gspl/text-source';

// ============================================================
// AstKind — discriminated union tag for AST nodes
// ============================================================

export const enum AstKind {
  // Top-level
  Program = 1,
  ModuleDecl = 2,
  // Declarations
  SeedDecl = 10,
  GeneDecl = 11,
  ConstraintBlock = 12,
  EntropyBlock = 13,
  EffectsBlock = 14,
  BudgetBlock = 15,
  TargetDecl = 16,
  ExtensionDecl = 17,
  ImportDecl = 18,
  ExportDecl = 19,
  // Clauses
  SimpleClause = 30,
  // Types
  NamedType = 40,
  ListType = 41,
  MapType = 42,
  OptionalType = 43,
  // Expressions
  LiteralExpr = 50,
  IdentifierExpr = 51,
  BinaryExpr = 52,
  UnaryExpr = 53,
  ListExpr = 54,
  RecordExpr = 55,
  // Errors
  ErrorNode = 99,
}

// ============================================================
// AstNodeId — deterministic within a compilation
// ============================================================

export type AstNodeId = number & { readonly __brand: 'AstNodeId' };

// ============================================================
// SyntaxReference — links AST node back to CST
// ============================================================

export interface SyntaxReference {
  readonly kind: SyntaxKind;
  readonly span: SourceSpan;
}

// ============================================================
// Base interface
// ============================================================

export interface AstNodeBase {
  readonly kind: AstKind;
  readonly id: AstNodeId;
  readonly syntax: SyntaxReference;
  readonly span: SourceSpan;
}

// ============================================================
// Declaration nodes
// ============================================================

export interface ProgramNode extends AstNodeBase {
  readonly kind: AstKind.Program;
  readonly languageVersion: string;
  readonly imports: readonly ImportDeclNode[];
  readonly exports: readonly ExportDeclNode[];
  readonly seed: SeedDeclNode | undefined;
  readonly topLevelGenes: readonly GeneDeclNode[];
}

export interface ImportDeclNode extends AstNodeBase {
  readonly kind: AstKind.ImportDecl;
  readonly path: string;
  readonly alias: string | undefined;
}

export interface ExportDeclNode extends AstNodeBase {
  readonly kind: AstKind.ExportDecl;
  readonly names: readonly string[];
}

export interface SeedDeclNode extends AstNodeBase {
  readonly kind: AstKind.SeedDecl;
  readonly version: string | undefined;
  readonly clauses: readonly SimpleClauseNode[];
  readonly genes: readonly GeneDeclNode[];
  readonly constraints: ConstraintBlockNode | undefined;
  readonly entropy: EntropyBlockNode | undefined;
  readonly effects: EffectsBlockNode | undefined;
  readonly budget: BudgetBlockNode | undefined;
  readonly targets: readonly TargetDeclNode[];
  readonly extensions: readonly ExtensionDeclNode[];
}

export interface GeneDeclNode extends AstNodeBase {
  readonly kind: AstKind.GeneDecl;
  readonly isPrivate: boolean;
  readonly name: string;
  readonly typeAnnotation: TypeNode | undefined;
  readonly value: ExprNode | undefined;
  readonly confidence: number | undefined;
}

export interface ConstraintBlockNode extends AstNodeBase {
  readonly kind: AstKind.ConstraintBlock;
  readonly clauses: readonly SimpleClauseNode[];
}

export interface EntropyBlockNode extends AstNodeBase {
  readonly kind: AstKind.EntropyBlock;
  readonly clauses: readonly SimpleClauseNode[];
}

export interface EffectsBlockNode extends AstNodeBase {
  readonly kind: AstKind.EffectsBlock;
  readonly clauses: readonly SimpleClauseNode[];
}

export interface BudgetBlockNode extends AstNodeBase {
  readonly kind: AstKind.BudgetBlock;
  readonly clauses: readonly SimpleClauseNode[];
}

export interface TargetDeclNode extends AstNodeBase {
  readonly kind: AstKind.TargetDecl;
  readonly name: string | undefined;
  readonly targetType: string | undefined;
  readonly clauses: readonly SimpleClauseNode[];
}

export interface ExtensionDeclNode extends AstNodeBase {
  readonly kind: AstKind.ExtensionDecl;
  readonly name: string | undefined;
  readonly parameters: readonly { name: string; type: TypeNode | undefined }[];
  readonly returnType: TypeNode | undefined;
  readonly value: ExprNode | undefined;
}

export interface SimpleClauseNode extends AstNodeBase {
  readonly kind: AstKind.SimpleClause;
  readonly keyword: string;
  readonly value: string | undefined;
}

// ============================================================
// Type nodes
// ============================================================

export type TypeNode = NamedTypeNode | ListTypeNode | MapTypeNode | OptionalTypeNode;

export interface NamedTypeNode extends AstNodeBase {
  readonly kind: AstKind.NamedType;
  readonly name: string;
}

export interface ListTypeNode extends AstNodeBase {
  readonly kind: AstKind.ListType;
  readonly elementType: TypeNode;
}

export interface MapTypeNode extends AstNodeBase {
  readonly kind: AstKind.MapType;
  readonly fields: readonly { name: string; type: TypeNode }[];
}

export interface OptionalTypeNode extends AstNodeBase {
  readonly kind: AstKind.OptionalType;
  readonly inner: TypeNode;
}

// ============================================================
// Expression nodes
// ============================================================

export type ExprNode =
  | LiteralExprNode
  | IdentifierExprNode
  | BinaryExprNode
  | UnaryExprNode
  | ListExprNode
  | RecordExprNode;

export interface LiteralExprNode extends AstNodeBase {
  readonly kind: AstKind.LiteralExpr;
  readonly literalKind: 'integer' | 'float' | 'string' | 'boolean' | 'absence';
  readonly value: string;
}

export interface IdentifierExprNode extends AstNodeBase {
  readonly kind: AstKind.IdentifierExpr;
  readonly name: string;
}

export interface BinaryExprNode extends AstNodeBase {
  readonly kind: AstKind.BinaryExpr;
  readonly operator: string;
  readonly left: ExprNode;
  readonly right: ExprNode;
}

export interface UnaryExprNode extends AstNodeBase {
  readonly kind: AstKind.UnaryExpr;
  readonly operator: string;
  readonly operand: ExprNode;
}

export interface ListExprNode extends AstNodeBase {
  readonly kind: AstKind.ListExpr;
  readonly elements: readonly ExprNode[];
}

export interface RecordExprNode extends AstNodeBase {
  readonly kind: AstKind.RecordExpr;
  readonly fields: readonly { name: string; value: ExprNode }[];
}

// ============================================================
// Error node
// ============================================================

export interface ErrorNode extends AstNodeBase {
  readonly kind: AstKind.ErrorNode;
  readonly message: string;
}

// ============================================================
// Union of all AST nodes
// ============================================================

export type AnyAstNode =
  | ProgramNode
  | ImportDeclNode
  | ExportDeclNode
  | SeedDeclNode
  | GeneDeclNode
  | ConstraintBlockNode
  | EntropyBlockNode
  | EffectsBlockNode
  | BudgetBlockNode
  | TargetDeclNode
  | ExtensionDeclNode
  | SimpleClauseNode
  | NamedTypeNode
  | ListTypeNode
  | MapTypeNode
  | OptionalTypeNode
  | LiteralExprNode
  | IdentifierExprNode
  | BinaryExprNode
  | UnaryExprNode
  | ListExprNode
  | RecordExprNode
  | ErrorNode;

// ============================================================
// Lowering result
// ============================================================

export interface AstLoweringResult {
  readonly program: ProgramNode;
  readonly diagnostics: readonly Diagnostic[];
  readonly nodeCount: number;
}

// ============================================================
// Type guards (exhaustive)
// ============================================================

export function isProgram(n: AnyAstNode): n is ProgramNode { return n.kind === AstKind.Program; }
export function isSeedDecl(n: AnyAstNode): n is SeedDeclNode { return n.kind === AstKind.SeedDecl; }
export function isGeneDecl(n: AnyAstNode): n is GeneDeclNode { return n.kind === AstKind.GeneDecl; }
export function isImportDecl(n: AnyAstNode): n is ImportDeclNode { return n.kind === AstKind.ImportDecl; }
export function isExportDecl(n: AnyAstNode): n is ExportDeclNode { return n.kind === AstKind.ExportDecl; }
export function isConstraintBlock(n: AnyAstNode): n is ConstraintBlockNode { return n.kind === AstKind.ConstraintBlock; }
export function isEntropyBlock(n: AnyAstNode): n is EntropyBlockNode { return n.kind === AstKind.EntropyBlock; }
export function isEffectsBlock(n: AnyAstNode): n is EffectsBlockNode { return n.kind === AstKind.EffectsBlock; }
export function isBudgetBlock(n: AnyAstNode): n is BudgetBlockNode { return n.kind === AstKind.BudgetBlock; }
export function isTargetDecl(n: AnyAstNode): n is TargetDeclNode { return n.kind === AstKind.TargetDecl; }
export function isExtensionDecl(n: AnyAstNode): n is ExtensionDeclNode { return n.kind === AstKind.ExtensionDecl; }
export function isSimpleClause(n: AnyAstNode): n is SimpleClauseNode { return n.kind === AstKind.SimpleClause; }
export function isErrorNode(n: AnyAstNode): n is ErrorNode { return n.kind === AstKind.ErrorNode; }
export function isLiteralExpr(n: AnyAstNode): n is LiteralExprNode { return n.kind === AstKind.LiteralExpr; }
export function isIdentifierExpr(n: AnyAstNode): n is IdentifierExprNode { return n.kind === AstKind.IdentifierExpr; }
export function isBinaryExpr(n: AnyAstNode): n is BinaryExprNode { return n.kind === AstKind.BinaryExpr; }
export function isUnaryExpr(n: AnyAstNode): n is UnaryExprNode { return n.kind === AstKind.UnaryExpr; }
export function isListExpr(n: AnyAstNode): n is ListExprNode { return n.kind === AstKind.ListExpr; }
export function isRecordExpr(n: AnyAstNode): n is RecordExprNode { return n.kind === AstKind.RecordExpr; }
export function isNamedType(n: AnyAstNode): n is NamedTypeNode { return n.kind === AstKind.NamedType; }
export function isListType(n: AnyAstNode): n is ListTypeNode { return n.kind === AstKind.ListType; }
export function isMapType(n: AnyAstNode): n is MapTypeNode { return n.kind === AstKind.MapType; }
export function isOptionalType(n: AnyAstNode): n is OptionalTypeNode { return n.kind === AstKind.OptionalType; }
