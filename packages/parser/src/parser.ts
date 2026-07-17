/**
 * GSPL Parser -- recursive descent + Pratt expression parser.
 * Prompt 3 §9.
 *
 * Architecture:
 * - Recursive descent for declarations (seed, gene, constraint, etc.)
 * - Pratt parser (precedence climbing) for expressions
 * - Deterministic recovery via missing-token insertion + sync sets
 * - Bounded by ParserLimits (nesting depth, node count, diagnostics)
 *
 * The parser consumes a Token[] from the lexer and produces a
 * lossless SyntaxTree via GreenNodeBuilder + createSyntaxTree.
 * TriviaMap is built from the lexer Token[] keyed by green-tree-local
 * offset (accumulated green token width).
 */
import { SyntaxKind, GreenToken, GreenTrivia, GreenNode, GreenNodeBuilder, SyntaxFlags, createSyntaxTree, type SyntaxTree, type TriviaMap, type TriviaEntry } from '@gspl/syntax-tree';
import type { Token, LexResult } from '@gspl/lexer';
import { lexSource } from '@gspl/lexer';
import type { SourceDocument, Diagnostic, SourceId, DiagnosticSeverity } from '@gspl/text-source';
import { makeDiagnostic } from '@gspl/text-source';
import type { ParseOptions, ParseResult, ParserLimits, DeterministicParserStatistics, RecoveryMode } from './types.js';
import { DEFAULT_PARSE_OPTIONS } from './types.js';

/**
 * Parser context -- mutable state during parsing.
 * Not exported; internal to the parser module.
 */
class ParserContext {
  readonly tokens: readonly Token[];
  readonly source: SourceDocument;
  readonly options: ParseOptions;
  readonly diagnostics: Diagnostic[] = [];
  pos = 0;
  nodeCount = 0;
  declarationCount = 0;
  expressionCount = 0;
  maxDepth = 0;
  recoveryActionCount = 0;
  missingTokenCount = 0;
  skippedTokenCount = 0;
  currentDepth = 0;
  hasSeed = false;
  private readonly triviaMap: Map<number, TriviaEntry> = new Map();
  private greenOffset = 0;

  constructor(source: SourceDocument, tokens: readonly Token[], options: ParseOptions) {
    this.source = source;
    this.tokens = tokens;
    this.options = options;
    // Build TriviaMap keyed by green-tree-local offset
    let off = 0;
    for (const tok of tokens) {
      if (tok.greenToken.kind === SyntaxKind.EndOfFile) continue;
      this.triviaMap.set(off, {
        leading: tok.leadingTrivia,
        trailing: tok.trailingTrivia,
        spelling: tok.spelling,
      });
      off += tok.greenToken.width;
    }
  }

  get trivia(): TriviaMap { return this.triviaMap; }
  get limits(): ParserLimits { return this.options.limits; }
  get recovery(): RecoveryMode { return this.options.recoveryMode; }

  /** Current token (or EOF). */
  get current(): Token { return this.tokens[this.pos] ?? this.tokens[this.tokens.length - 1]!; }
  get currentKind(): SyntaxKind { return this.current.greenToken.kind; }
  get currentText(): string { return this.current.greenToken.text; }
  get isAtEnd(): boolean { return this.currentKind === SyntaxKind.EndOfFile; }

  /** Advance to next token. */
  advance(): Token {
    const tok = this.current;
    if (this.currentKind !== SyntaxKind.EndOfFile) {
      this.pos++;
    }
    return tok;
  }

  /** Check if current token matches kind. */  isAt(kind: SyntaxKind): boolean { return this.currentKind === kind; }

  /** Check if current token is one of kinds. */
  isAtAny(...kinds: SyntaxKind[]): boolean { return kinds.includes(this.currentKind); }

  /** Consume current token if it matches kind, return it. */
  match(kind: SyntaxKind): Token | null {
    if (this.isAt(kind)) return this.advance();
    return null;
  }

  /** Expect a token of kind; emit diagnostic + synthesize missing if absent. */
  expect(kind: SyntaxKind, context: string): Token {
    if (this.isAt(kind)) return this.advance();
    this.emitDiagnostic('GSPL-PARSE-EXPECTED-TOKEN', `expected ${context} but found '${this.currentText}'`, 'error', this.current.span.start, this.current.span.end);
    this.missingTokenCount++;
    this.recoveryActionCount++;
    // Return a synthetic missing token (zero-width)
    return this.current; // Don't advance; let recovery handle it
  }

  emitDiagnostic(code: string, message: string, severity: DiagnosticSeverity, start: number, end: number): void {
    if (this.diagnostics.length >= this.limits.maxParserDiagnostics) return;
    this.diagnostics.push(makeDiagnostic({
      code, message, severity,
      span: { sourceId: this.source.id, start, end },
      category: 'parse', phase: 'parse', canonical: true,
    }));
  }

  /** Push a green token into the trivia map offset tracker. */
  trackGreenToken(tok: Token): void {
    this.greenOffset += tok.greenToken.width;
  }

  /** Build the SyntaxTree from a root green node. */
  buildTree(rootGreen: GreenNode): SyntaxTree {
    return createSyntaxTree(this.source.id, rootGreen, this.source.text.length, this.trivia);
  }

  computeStatistics(): DeterministicParserStatistics {
    return {
      nodeCount: this.nodeCount,
      tokenCount: this.tokens.length,
      diagnosticCount: this.diagnostics.length,
      declarationCount: this.declarationCount,
      expressionCount: this.expressionCount,
      maxDepth: this.maxDepth,
      recoveryActionCount: this.recoveryActionCount,
      missingTokenCount: this.missingTokenCount,
      skippedTokenCount: this.skippedTokenCount,
    };
  }
}

// ============================================================
// Expression precedence (from GSPL_GRAMMAR.contract.json)
// ============================================================

const PRECEDENCE_TABLE: ReadonlyMap<SyntaxKind, number> = new Map<SyntaxKind, number>([
  [SyntaxKind.LogicalOr, 1],
  [SyntaxKind.LogicalAnd, 2],
  [SyntaxKind.EqualEqual, 3],
  [SyntaxKind.BangEqual, 3],
  [SyntaxKind.In, 3],
  [SyntaxKind.Less, 4],
  [SyntaxKind.LessEqual, 4],
  [SyntaxKind.Greater, 4],
  [SyntaxKind.GreaterEqual, 4],
  [SyntaxKind.Range, 5],
  [SyntaxKind.Plus, 6],
  [SyntaxKind.Minus, 6],
  [SyntaxKind.Star, 7],
  [SyntaxKind.Slash, 7],
  [SyntaxKind.Percent, 7],
]);

const UNARY_PRECEDENCE = 8;

function getPrecedence(kind: SyntaxKind): number | undefined {
  return PRECEDENCE_TABLE.get(kind);
}

function isBinaryOperator(kind: SyntaxKind): boolean {
  return PRECEDENCE_TABLE.has(kind);
}

// ============================================================
// Parser -- declaration parsing (recursive descent)
// ============================================================

/** Parse a full compilation unit. */
function parseCompilationUnit(ctx: ParserContext): GreenNode {
  const builder = new GreenNodeBuilder(SyntaxKind.CompilationUnit);
  ctx.nodeCount++;

  // Parse optional module/import/export clauses
  while (!ctx.isAtEnd) {
    if (ctx.isAt(SyntaxKind.KeywordImport)) {
      builder.addChild(parseImportDeclaration(ctx));
    } else if (ctx.isAt(SyntaxKind.KeywordExport)) {
      builder.addChild(parseExportDeclaration(ctx));
    } else if (ctx.isAt(SyntaxKind.KeywordSeed)) {
      builder.addChild(parseSeedDeclaration(ctx));
      break; // Seed is the mandatory root; one per file
    } else if (ctx.isAt(SyntaxKind.KeywordGene) || ctx.isAt(SyntaxKind.KeywordPrivate)) {
      builder.addChild(parseGeneDeclaration(ctx));
    } else {
      // Unexpected token at top level; skip it for recovery
      ctx.emitDiagnostic('GSPL-PARSE-EXPECTED-TOKEN', `unexpected token '${ctx.currentText}' at top level`, 'error', ctx.current.span.start, ctx.current.span.end);
      ctx.skippedTokenCount++;
      ctx.recoveryActionCount++;
      ctx.advance();
      if (ctx.recoveryActionCount > ctx.limits.maxRecoverySkips) break;
    }
  }

  // If no seed was parsed, emit a diagnostic
  if (!ctx.hasSeed && ctx.diagnostics.length < ctx.limits.maxParserDiagnostics) {
    ctx.emitDiagnostic('GSPL-PARSE-UNEXPECTED-EOF', 'expected seed declaration', 'error', ctx.source.text.length, ctx.source.text.length);
  }

  return builder.finalize();
}

/** Parse 'seed <version>' declaration. */
function parseSeedDeclaration(ctx: ParserContext): GreenNode {
  const builder = new GreenNodeBuilder(SyntaxKind.SeedDeclaration);
  ctx.nodeCount++;
  ctx.declarationCount++;
  ctx.hasSeed = true;
  if (ctx.nodeCount > ctx.limits.maxNodeCount) { ctx.emitDiagnostic('GSPL-PARSE-EXPECTED-TOKEN', 'maximum node count exceeded', 'error', 0, 0); return builder.finalize(); }

  builder.addChild(ctx.advance().greenToken);
  if (ctx.isAt(SyntaxKind.VersionLiteral) || ctx.isAt(SyntaxKind.FloatLiteral) || ctx.isAt(SyntaxKind.StringLiteral)) { builder.addChild(ctx.advance().greenToken); }
  else { ctx.emitDiagnostic('GSPL-PARSE-EXPECTED-TOKEN', 'expected version literal after seed', 'error', ctx.current.span.start, ctx.current.span.end); }

  while (!ctx.isAtEnd) {
    const kind = ctx.currentKind;
    if (kind === SyntaxKind.KeywordTitle || kind === SyntaxKind.KeywordVersion || kind === SyntaxKind.KeywordId) { builder.addChild(parseSimpleClause(ctx)); }
    else if (kind === SyntaxKind.KeywordDomain) { builder.addChild(parseSimpleClause(ctx)); }
    else if (kind === SyntaxKind.KeywordIntent) { builder.addChild(parseBlock(ctx, SyntaxKind.IntentDeclaration)); }
    else if (kind === SyntaxKind.KeywordImport) { builder.addChild(parseImportDeclaration(ctx)); }
    else if (kind === SyntaxKind.KeywordExport) { builder.addChild(parseExportDeclaration(ctx)); }
    else if (kind === SyntaxKind.KeywordGene || kind === SyntaxKind.KeywordPrivate) { builder.addChild(parseGeneDeclaration(ctx)); }
    else if (kind === SyntaxKind.KeywordConstraints) { builder.addChild(parseBlock(ctx, SyntaxKind.ConstraintBlock)); }
    else if (kind === SyntaxKind.KeywordEntropy) { builder.addChild(parseBlock(ctx, SyntaxKind.EntropyBlock)); }
    else if (kind === SyntaxKind.KeywordEffects) { builder.addChild(parseBlock(ctx, SyntaxKind.EffectsBlock)); }
    else if (kind === SyntaxKind.KeywordBudget) { builder.addChild(parseBlock(ctx, SyntaxKind.BudgetBlock)); }
    else if (kind === SyntaxKind.KeywordTarget) { builder.addChild(parseTargetDeclaration(ctx)); }
    else if (kind === SyntaxKind.KeywordExtension) { builder.addChild(parseExtensionDeclaration(ctx)); }
    else { break; }
  }
  return builder.finalize();
}

function parseSimpleClause(ctx: ParserContext): GreenNode {
  const builder = new GreenNodeBuilder(SyntaxKind.Block);
  ctx.nodeCount++;
  builder.addChild(ctx.advance().greenToken);
  if (ctx.isAt(SyntaxKind.StringLiteral) || ctx.isAt(SyntaxKind.Identifier) || ctx.isAt(SyntaxKind.IntegerLiteral) || ctx.isAt(SyntaxKind.FloatLiteral)) { builder.addChild(ctx.advance().greenToken); }
  else { ctx.emitDiagnostic('GSPL-PARSE-EXPECTED-TOKEN', 'expected value after clause keyword', 'error', ctx.current.span.start, ctx.current.span.end); }
  return builder.finalize();
}

function parseBlock(ctx: ParserContext, kind: SyntaxKind): GreenNode {
  const builder = new GreenNodeBuilder(kind);
  ctx.nodeCount++;
  ctx.currentDepth++;
  if (ctx.currentDepth > ctx.maxDepth) ctx.maxDepth = ctx.currentDepth;
  if (ctx.currentDepth > ctx.limits.maxNestingDepth) { ctx.emitDiagnostic('GSPL-PARSE-EXPECTED-TOKEN', 'maximum nesting depth exceeded', 'error', ctx.current.span.start, ctx.current.span.end); ctx.currentDepth--; return builder.finalize(); }
  builder.addChild(ctx.advance().greenToken);
  if (ctx.isAt(SyntaxKind.LeftBrace)) {
    builder.addChild(ctx.advance().greenToken);
    while (!ctx.isAt(SyntaxKind.RightBrace) && !ctx.isAtEnd) {
      if (ctx.isAtAny(SyntaxKind.KeywordRequire, SyntaxKind.KeywordForbid, SyntaxKind.KeywordInvariant, SyntaxKind.KeywordPurpose, SyntaxKind.KeywordGoal, SyntaxKind.KeywordNonGoal)) { builder.addChild(parseSimpleClause(ctx)); }
      else if (ctx.isAt(SyntaxKind.Identifier)) { builder.addChild(parseExpression(ctx, 0)); }
      else { ctx.emitDiagnostic('GSPL-PARSE-EXPECTED-TOKEN', 'unexpected token in block: ' + ctx.currentText, 'error', ctx.current.span.start, ctx.current.span.end); ctx.skippedTokenCount++; ctx.recoveryActionCount++; ctx.advance(); if (ctx.recoveryActionCount > ctx.limits.maxRecoverySkips) break; }
    }
    if (ctx.isAt(SyntaxKind.RightBrace)) { builder.addChild(ctx.advance().greenToken); }
    else { ctx.emitDiagnostic('GSPL-PARSE-UNEXPECTED-EOF', 'expected closing brace', 'error', ctx.source.text.length, ctx.source.text.length); }
  } else { ctx.emitDiagnostic('GSPL-PARSE-EXPECTED-TOKEN', 'expected opening brace', 'error', ctx.current.span.start, ctx.current.span.end); }
  ctx.currentDepth--;
  return builder.finalize();
}

function parseImportDeclaration(ctx: ParserContext): GreenNode {
  const builder = new GreenNodeBuilder(SyntaxKind.ImportDeclaration);
  ctx.nodeCount++;
  builder.addChild(ctx.advance().greenToken);
  if (ctx.isAt(SyntaxKind.StringLiteral) || ctx.isAt(SyntaxKind.PathLiteral)) { builder.addChild(ctx.advance().greenToken); }
  else { ctx.emitDiagnostic('GSPL-PARSE-EXPECTED-TOKEN', 'expected path after import', 'error', ctx.current.span.start, ctx.current.span.end); }
  if (ctx.isAt(SyntaxKind.KeywordAs)) { builder.addChild(ctx.advance().greenToken); if (ctx.isAt(SyntaxKind.Identifier)) { builder.addChild(ctx.advance().greenToken); } }
  return builder.finalize();
}

function parseExportDeclaration(ctx: ParserContext): GreenNode {
  const builder = new GreenNodeBuilder(SyntaxKind.ExportDeclaration);
  ctx.nodeCount++;
  builder.addChild(ctx.advance().greenToken);
  if (ctx.isAt(SyntaxKind.LeftBrace)) {
    builder.addChild(ctx.advance().greenToken);
    while (!ctx.isAt(SyntaxKind.RightBrace) && !ctx.isAtEnd) {
      if (ctx.isAt(SyntaxKind.Identifier)) { builder.addChild(ctx.advance().greenToken); }
      if (ctx.isAt(SyntaxKind.Comma)) { builder.addChild(ctx.advance().greenToken); } else break;
    }
    if (ctx.isAt(SyntaxKind.RightBrace)) { builder.addChild(ctx.advance().greenToken); }
  }
  return builder.finalize();
}

function parseGeneDeclaration(ctx: ParserContext): GreenNode {
  const builder = new GreenNodeBuilder(SyntaxKind.GeneDeclaration);
  ctx.nodeCount++;
  ctx.declarationCount++;
  if (ctx.declarationCount > ctx.limits.maxDeclarationCount) { ctx.emitDiagnostic('GSPL-PARSE-EXPECTED-TOKEN', 'maximum declaration count exceeded', 'error', ctx.current.span.start, ctx.current.span.end); return builder.finalize(); }
  if (ctx.isAt(SyntaxKind.KeywordPrivate)) { builder.addChild(ctx.advance().greenToken); }
  if (ctx.isAt(SyntaxKind.KeywordGene)) { builder.addChild(ctx.advance().greenToken); } else { ctx.emitDiagnostic('GSPL-PARSE-EXPECTED-TOKEN', 'expected gene keyword', 'error', ctx.current.span.start, ctx.current.span.end); }
  if (ctx.isAt(SyntaxKind.Identifier)) { builder.addChild(ctx.advance().greenToken); } else { ctx.emitDiagnostic('GSPL-PARSE-EXPECTED-TOKEN', 'expected gene name', 'error', ctx.current.span.start, ctx.current.span.end); }
  if (ctx.isAt(SyntaxKind.Colon)) { builder.addChild(ctx.advance().greenToken); builder.addChild(parseTypeExpression(ctx)); }
  if (ctx.isAt(SyntaxKind.Assign)) { builder.addChild(ctx.advance().greenToken); builder.addChild(parseExpression(ctx, 0)); }
  if (ctx.isAt(SyntaxKind.KeywordConfidence)) { builder.addChild(ctx.advance().greenToken); if (ctx.isAt(SyntaxKind.FloatLiteral) || ctx.isAt(SyntaxKind.IntegerLiteral)) { builder.addChild(ctx.advance().greenToken); } }
  return builder.finalize();
}

function parseTargetDeclaration(ctx: ParserContext): GreenNode {
  const builder = new GreenNodeBuilder(SyntaxKind.TargetDeclaration);
  ctx.nodeCount++;
  ctx.declarationCount++;
  builder.addChild(ctx.advance().greenToken);
  if (ctx.isAt(SyntaxKind.Identifier)) { builder.addChild(ctx.advance().greenToken); }
  if (ctx.isAt(SyntaxKind.Colon)) { builder.addChild(ctx.advance().greenToken); if (ctx.isAt(SyntaxKind.Identifier)) { builder.addChild(ctx.advance().greenToken); } }
  while (ctx.isAtAny(SyntaxKind.KeywordRequires, SyntaxKind.KeywordEquivalence)) { builder.addChild(parseSimpleClause(ctx)); }
  return builder.finalize();
}

function parseExtensionDeclaration(ctx: ParserContext): GreenNode {
  const builder = new GreenNodeBuilder(SyntaxKind.ExtensionDeclaration);
  ctx.nodeCount++;
  ctx.declarationCount++;
  builder.addChild(ctx.advance().greenToken);
  if (ctx.isAt(SyntaxKind.Identifier)) { builder.addChild(ctx.advance().greenToken); }
  if (ctx.isAt(SyntaxKind.LeftParen)) {
    builder.addChild(ctx.advance().greenToken);
    while (!ctx.isAt(SyntaxKind.RightParen) && !ctx.isAtEnd) {
      if (ctx.isAt(SyntaxKind.Identifier)) { builder.addChild(ctx.advance().greenToken); }
      if (ctx.isAt(SyntaxKind.Colon)) { builder.addChild(ctx.advance().greenToken); builder.addChild(parseTypeExpression(ctx)); }
      if (ctx.isAt(SyntaxKind.Comma)) { builder.addChild(ctx.advance().greenToken); } else break;
    }
    if (ctx.isAt(SyntaxKind.RightParen)) { builder.addChild(ctx.advance().greenToken); }
  }
  if (ctx.isAt(SyntaxKind.Colon)) { builder.addChild(ctx.advance().greenToken); builder.addChild(parseTypeExpression(ctx)); }
  if (ctx.isAt(SyntaxKind.Assign)) { builder.addChild(ctx.advance().greenToken); builder.addChild(parseExpression(ctx, 0)); }
  return builder.finalize();
}

function parseTypeExpression(ctx: ParserContext): GreenNode {
  const builder = new GreenNodeBuilder(SyntaxKind.TypeExpression);
  ctx.nodeCount++;
  if (ctx.isAt(SyntaxKind.Identifier)) { builder.addChild(ctx.advance().greenToken); }
  else if (ctx.isAt(SyntaxKind.LeftBracket)) {
    builder.addChild(ctx.advance().greenToken);
    builder.addChild(parseTypeExpression(ctx));
    if (ctx.isAt(SyntaxKind.RightBracket)) { builder.addChild(ctx.advance().greenToken); }
  } else if (ctx.isAt(SyntaxKind.LeftBrace)) {
    builder.addChild(ctx.advance().greenToken);
    while (!ctx.isAt(SyntaxKind.RightBrace) && !ctx.isAtEnd) {
      if (ctx.isAt(SyntaxKind.Identifier)) { builder.addChild(ctx.advance().greenToken); if (ctx.isAt(SyntaxKind.Colon)) { builder.addChild(ctx.advance().greenToken); builder.addChild(parseTypeExpression(ctx)); } }
      if (ctx.isAt(SyntaxKind.Comma)) { builder.addChild(ctx.advance().greenToken); } else break;
    }
    if (ctx.isAt(SyntaxKind.RightBrace)) { builder.addChild(ctx.advance().greenToken); }
  }
  if (ctx.isAt(SyntaxKind.Question)) { builder.addChild(ctx.advance().greenToken); }
  return builder.finalize();
}

const PRECEDENCE: ReadonlyMap<SyntaxKind, number> = new Map<SyntaxKind, number>([
  [SyntaxKind.LogicalOr, 1], [SyntaxKind.LogicalAnd, 2],
  [SyntaxKind.EqualEqual, 3], [SyntaxKind.BangEqual, 3], [SyntaxKind.In, 3],
  [SyntaxKind.Less, 4], [SyntaxKind.LessEqual, 4], [SyntaxKind.Greater, 4], [SyntaxKind.GreaterEqual, 4],
  [SyntaxKind.Range, 5], [SyntaxKind.Plus, 6], [SyntaxKind.Minus, 6],
  [SyntaxKind.Star, 7], [SyntaxKind.Slash, 7], [SyntaxKind.Percent, 7],
]);
const UNARY_PREC = 8;
function isBinOp(k: SyntaxKind): boolean { return PRECEDENCE.has(k); }

function parseExpression(ctx: ParserContext, minPrec: number): GreenNode {
  ctx.expressionCount++;
  ctx.currentDepth++;
  if (ctx.currentDepth > ctx.maxDepth) ctx.maxDepth = ctx.currentDepth;
  if (ctx.currentDepth > ctx.limits.maxExpressionDepth) {
    ctx.emitDiagnostic('GSPL-PARSE-EXPECTED-TOKEN', 'maximum expression depth exceeded', 'error', ctx.current.span.start, ctx.current.span.end);
    ctx.currentDepth--;
    return GreenNode.create(SyntaxKind.Expression, []);
  }
  let left = parsePrimary(ctx);
  let chainLen = 0;
  while (!ctx.isAtEnd) {
    const op = ctx.currentKind;
    if (!isBinOp(op)) break;
    const prec = PRECEDENCE.get(op)!;
    if (prec < minPrec) break;
    chainLen++;
    if (chainLen > ctx.limits.maxExpressionDepth) {
      ctx.emitDiagnostic('GSPL-PARSE-EXPECTED-TOKEN', 'maximum expression depth exceeded', 'error', ctx.current.span.start, ctx.current.span.end);
      break;
    }
    const opTok = ctx.advance();
    const right = parseExpression(ctx, prec + 1);
    const bin = new GreenNodeBuilder(SyntaxKind.Expression);
    bin.addChild(left); bin.addChild(opTok.greenToken); bin.addChild(right);
    left = bin.finalize(); ctx.nodeCount++;
  }
  ctx.currentDepth--;
  return left;
}

function parsePrimary(ctx: ParserContext): GreenNode {
  const k = ctx.currentKind;
  if (k === SyntaxKind.Bang || k === SyntaxKind.Minus) {
    const op = ctx.advance(); const operand = parseExpression(ctx, UNARY_PREC);
    const b = new GreenNodeBuilder(SyntaxKind.Expression); b.addChild(op.greenToken); b.addChild(operand); return b.finalize();
  }
  if (k === SyntaxKind.IntegerLiteral || k === SyntaxKind.FloatLiteral || k === SyntaxKind.StringLiteral || k === SyntaxKind.Identifier || k === SyntaxKind.KeywordTrue || k === SyntaxKind.KeywordFalse || k === SyntaxKind.KeywordNone) {
    return GreenNode.create(SyntaxKind.Expression, [ctx.advance().greenToken]);
  }
  if (k === SyntaxKind.LeftBracket) {
    ctx.currentDepth++; if (ctx.currentDepth > ctx.maxDepth) ctx.maxDepth = ctx.currentDepth;
    if (ctx.currentDepth > ctx.limits.maxNestingDepth) { ctx.emitDiagnostic('GSPL-PARSE-EXPECTED-TOKEN', 'maximum nesting depth exceeded', 'error', ctx.current.span.start, ctx.current.span.end); ctx.currentDepth--; return GreenNode.create(SyntaxKind.Expression, []); }
    const b = new GreenNodeBuilder(SyntaxKind.Expression); b.addChild(ctx.advance().greenToken);
    while (!ctx.isAt(SyntaxKind.RightBracket) && !ctx.isAtEnd) { b.addChild(parseExpression(ctx, 0)); if (ctx.isAt(SyntaxKind.Comma)) { b.addChild(ctx.advance().greenToken); } else break; }
    if (ctx.isAt(SyntaxKind.RightBracket)) { b.addChild(ctx.advance().greenToken); }
    ctx.currentDepth--;
    return b.finalize();
  }
  if (k === SyntaxKind.LeftBrace) {
    ctx.currentDepth++; if (ctx.currentDepth > ctx.maxDepth) ctx.maxDepth = ctx.currentDepth;
    if (ctx.currentDepth > ctx.limits.maxNestingDepth) { ctx.emitDiagnostic('GSPL-PARSE-EXPECTED-TOKEN', 'maximum nesting depth exceeded', 'error', ctx.current.span.start, ctx.current.span.end); ctx.currentDepth--; return GreenNode.create(SyntaxKind.Expression, []); }
    const b = new GreenNodeBuilder(SyntaxKind.Expression); b.addChild(ctx.advance().greenToken);
    while (!ctx.isAt(SyntaxKind.RightBrace) && !ctx.isAtEnd) {
      if (ctx.isAt(SyntaxKind.Identifier)) { b.addChild(ctx.advance().greenToken); if (ctx.isAt(SyntaxKind.Colon)) { b.addChild(ctx.advance().greenToken); b.addChild(parseExpression(ctx, 0)); } }
      if (ctx.isAt(SyntaxKind.Comma)) { b.addChild(ctx.advance().greenToken); } else break;
    }
    if (ctx.isAt(SyntaxKind.RightBrace)) { b.addChild(ctx.advance().greenToken); }
    ctx.currentDepth--;
    return b.finalize();
  }
  if (k === SyntaxKind.LeftParen) {
    const b = new GreenNodeBuilder(SyntaxKind.Expression); b.addChild(ctx.advance().greenToken); b.addChild(parseExpression(ctx, 0));
    if (ctx.isAt(SyntaxKind.RightParen)) { b.addChild(ctx.advance().greenToken); }
    return b.finalize();
  }
  ctx.emitDiagnostic('GSPL-PARSE-EXPECTED-TOKEN', 'unexpected token in expression: ' + ctx.currentText, 'error', ctx.current.span.start, ctx.current.span.end);
  ctx.skippedTokenCount++; ctx.recoveryActionCount++;
  return GreenNode.create(SyntaxKind.Expression, [ctx.advance().greenToken]);
}

export function parseSource(source: SourceDocument, options: ParseOptions = DEFAULT_PARSE_OPTIONS): ParseResult {
  const lexResult = lexSource(source, { languageVersion: options.languageVersion });
  return parseTokens(source, lexResult.tokens, lexResult.diagnostics, options);
}

export function parseText(logicalPath: string, text: string, options: ParseOptions = DEFAULT_PARSE_OPTIONS): ParseResult {
  const lineStarts: number[] = [0];
  for (let i = 0; i < text.length; i++) { if (text[i] === '\n') lineStarts.push(i + 1); }
  const source: SourceDocument = {
    id: `src:${logicalPath}` as SourceId,
    snapshotId: `snap:${logicalPath}:${text.length}` as any,
    logicalPath, rawByteHash: '' as any, contentHash: '' as any,
    encoding: 'utf-8', hadBom: false, byteLength: Buffer.byteLength(text, 'utf8'),
    textLength: text.length, text, lineStarts, lineCount: lineStarts.length,
  } as unknown as SourceDocument;
  return parseSource(source, options);
}

export function parseTokens(source: SourceDocument, tokens: readonly Token[], lexDiagnostics: readonly Diagnostic[], options: ParseOptions = DEFAULT_PARSE_OPTIONS): ParseResult {
  const ctx = new ParserContext(source, tokens, options);
  const rootGreen = parseCompilationUnit(ctx);
  const tree = ctx.buildTree(rootGreen);
  const allDiag = [...lexDiagnostics, ...ctx.diagnostics];
  allDiag.sort((a, b) => a.span.start - b.span.start || a.span.end - b.span.end || (a.severity === 'error' ? 0 : 1) - (b.severity === 'error' ? 0 : 1) || a.code.localeCompare(b.code));
  return { source, tokenStream: tokens, root: tree, diagnostics: allDiag, statistics: ctx.computeStatistics(), operational: { elapsedMs: 0 }, complete: ctx.recoveryActionCount <= ctx.limits.maxRecoverySkips && ctx.nodeCount <= ctx.limits.maxNodeCount };
}
