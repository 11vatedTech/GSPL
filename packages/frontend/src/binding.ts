/** Symbol binding - scope tree, symbol tables, reference resolution.
 * Prompt 3 §13. Uses immutable side tables keyed by AstNodeId.
 */
import type { Diagnostic } from '@gspl/text-source';
import { makeDiagnostic } from '@gspl/text-source';
import type { AstNodeId, ProgramNode, SeedDeclNode, GeneDeclNode, ExprNode } from './ast-types.js';
import { isIdentifierExpr, isBinaryExpr, isUnaryExpr, isListExpr, isRecordExpr } from './ast-types.js';
import type { ModuleNode } from './module-resolver.js';

export const enum SymbolKind { Module=1,ImportAlias=2,Seed=3,Gene=4,Parameter=5,Constraint=6,Entropy=7,Effect=8,Budget=9,Target=10,Extension=11,Export=12 }
export type SymbolId = number & { readonly __brand: 'SymbolId' };
export interface Symbol { readonly id: SymbolId; readonly name: string; readonly normalizedName: string; readonly kind: SymbolKind; readonly declaration: AstNodeId; readonly isPublic: boolean; readonly sourceModule?: string; }
export const enum ScopeKind { Package=1,Module=2,Seed=3,Gene=4,Block=5 }
export type ScopeId = number & { readonly __brand: 'ScopeId' };
export interface Scope { readonly id: ScopeId; readonly kind: ScopeKind; readonly parent: Scope|undefined; readonly symbolMap: ReadonlyMap<string,readonly Symbol[]>; readonly children: readonly Scope[]; }
export interface BindingResult { readonly moduleScope: Scope; readonly symbolTable: ReadonlyMap<AstNodeId,Symbol>; readonly referenceBindings: ReadonlyMap<AstNodeId,Symbol>; readonly diagnostics: readonly Diagnostic[]; readonly symbolCount: number; readonly scopeCount: number; }

class BindingContext {
  readonly diagnostics: Diagnostic[] = [];
  symbolIdCounter = 0; scopeIdCounter = 0;
  readonly symbolTable = new Map<AstNodeId, Symbol>();
  readonly referenceBindings = new Map<AstNodeId, Symbol>();
  nextSymbolId(): SymbolId { return this.symbolIdCounter++ as SymbolId; }
  nextScopeId(): ScopeId { return this.scopeIdCounter++ as ScopeId; }
  emit(code: string, msg: string, start: number, end: number): void {
    this.diagnostics.push(makeDiagnostic({ code, message: msg, severity: 'error', span: { sourceId: 'src:bind' as any, start, end }, category: 'bind', phase: 'bind', canonical: true }));
  }
}

class ScopeBuilder {
  readonly id: ScopeId; readonly kind: ScopeKind;
  readonly parent: ScopeBuilder | undefined;
  private readonly symbols = new Map<string, Symbol[]>();
  readonly children: ScopeBuilder[] = [];
  constructor(id: ScopeId, kind: ScopeKind, parent?: ScopeBuilder) { this.id = id; this.kind = kind; this.parent = parent; }
  addSymbol(sym: Symbol, ctx: BindingContext, s: number, e: number): void {
    const key = sym.normalizedName;
    const existing = this.symbols.get(key);
    if (existing) { ctx.emit('GSPL-BIND-DUPLICATE-DECLARATION', 'duplicate declaration of "' + sym.name + '"', s, e); existing.push(sym); }
    else { this.symbols.set(key, [sym]); }
  }
  lookupLocal(name: string): readonly Symbol[] { return this.symbols.get(name.toLowerCase()) ?? []; }
  lookup(name: string): readonly Symbol[] { const local = this.lookupLocal(name); if (local.length > 0) return local; return this.parent ? this.parent.lookup(name) : []; }
  freeze(): Scope {
    const frozenChildren = this.children.map(function(c: ScopeBuilder): Scope { return c.freeze(); });
    const scope: Scope = {
      id: this.id, kind: this.kind,
      parent: undefined,
      symbolMap: new Map(this.symbols),
      children: frozenChildren,
    };
    for (const child of frozenChildren) { (child as any).parent = scope; }
    return scope;
  }
}

function norm(n: string): string { return n.toLowerCase(); }
function basename(p: string): string { return p.replace(/^.*[\/]/, '').replace(/\.[^.]+$/, ''); }

function bindProgram(program: ProgramNode, moduleNode: ModuleNode | undefined): BindingResult {
  const ctx = new BindingContext();
  const moduleScope = new ScopeBuilder(ctx.nextScopeId(), ScopeKind.Module);
  for (const imp of program.imports) {
    const name = imp.alias ?? basename(imp.path);
    const sym: Symbol = { id: ctx.nextSymbolId(), name, normalizedName: norm(name), kind: SymbolKind.ImportAlias, declaration: imp.id, isPublic: false, sourceModule: imp.path };
    moduleScope.addSymbol(sym, ctx, imp.span.start, imp.span.end); ctx.symbolTable.set(imp.id, sym);
  }
  for (const exp of program.exports) {
    for (const name of exp.names) {
      const sym: Symbol = { id: ctx.nextSymbolId(), name, normalizedName: norm(name), kind: SymbolKind.Export, declaration: exp.id, isPublic: true, sourceModule: moduleNode?.identity.logicalPath };
      moduleScope.addSymbol(sym, ctx, exp.span.start, exp.span.end); ctx.symbolTable.set(exp.id, sym);
    }
  }
  if (moduleNode) {
    const modSym: Symbol = { id: ctx.nextSymbolId(), name: moduleNode.identity.logicalPath, normalizedName: norm(moduleNode.identity.logicalPath), kind: SymbolKind.Module, declaration: program.id, isPublic: true, sourceModule: moduleNode.identity.logicalPath };
    ctx.symbolTable.set(program.id, modSym);
  }
  if (program.seed) { const seedScope = bindSeed(program.seed, moduleScope, ctx); resolveSeedReferences(program.seed, seedScope, ctx); }
  for (const gene of program.topLevelGenes) bindGene(gene, moduleScope, ctx);
  resolveTopLevelReferences(program, moduleScope, ctx);
  ctx.diagnostics.sort((a, b) => a.span.start - b.span.start || a.span.end - b.span.end || a.code.localeCompare(b.code));
  return { moduleScope: moduleScope.freeze(), symbolTable: ctx.symbolTable, referenceBindings: ctx.referenceBindings, diagnostics: ctx.diagnostics, symbolCount: ctx.symbolIdCounter, scopeCount: ctx.scopeIdCounter };
}

function bindSeed(seed: SeedDeclNode, parent: ScopeBuilder, ctx: BindingContext): ScopeBuilder {
  const scope = new ScopeBuilder(ctx.nextScopeId(), ScopeKind.Seed, parent); parent.children.push(scope);
  for (const gene of seed.genes) bindGene(gene, scope, ctx);
  for (const target of seed.targets) { if (target.name) { const sym: Symbol = { id: ctx.nextSymbolId(), name: target.name, normalizedName: norm(target.name), kind: SymbolKind.Target, declaration: target.id, isPublic: true }; scope.addSymbol(sym, ctx, target.span.start, target.span.end); ctx.symbolTable.set(target.id, sym); } }
  for (const ext of seed.extensions) { if (ext.name) { const sym: Symbol = { id: ctx.nextSymbolId(), name: ext.name, normalizedName: norm(ext.name), kind: SymbolKind.Extension, declaration: ext.id, isPublic: true }; scope.addSymbol(sym, ctx, ext.span.start, ext.span.end); ctx.symbolTable.set(ext.id, sym); } }
  return scope;
}
function bindGene(gene: GeneDeclNode, parent: ScopeBuilder, ctx: BindingContext): void {
  const sym: Symbol = { id: ctx.nextSymbolId(), name: gene.name, normalizedName: norm(gene.name), kind: SymbolKind.Gene, declaration: gene.id, isPublic: !gene.isPrivate };
  parent.addSymbol(sym, ctx, gene.span.start, gene.span.end); ctx.symbolTable.set(gene.id, sym);
  const scope = new ScopeBuilder(ctx.nextScopeId(), ScopeKind.Gene, parent); parent.children.push(scope);
}
function resolveSeedReferences(seed: SeedDeclNode, seedScope: ScopeBuilder, ctx: BindingContext): void {
  for (const gene of seed.genes) resolveInGene(gene, seedScope, ctx);
  for (const ext of seed.extensions) { if (ext.value) resolveInExpr(ext.value as ExprNode, seedScope, ctx); }
}
function resolveTopLevelReferences(program: ProgramNode, moduleScope: ScopeBuilder, ctx: BindingContext): void {
  for (const gene of program.topLevelGenes) resolveInGene(gene, moduleScope, ctx);
}
function resolveInGene(gene: GeneDeclNode, scope: ScopeBuilder, ctx: BindingContext): void { if (gene.value) resolveInExpr(gene.value, scope, ctx); }
function resolveInExpr(expr: ExprNode, scope: ScopeBuilder, ctx: BindingContext): void {
  if (isIdentifierExpr(expr)) {
    const results = scope.lookup(expr.name);
    if (results.length === 0) { ctx.emit('GSPL-BIND-UNRESOLVED-NAME', 'unresolved name: "' + expr.name + '"', expr.span.start, expr.span.end); }
    else if (results.length === 1) { ctx.referenceBindings.set(expr.id, results[0]); }
    else { ctx.emit('GSPL-BIND-AMBIGUOUS-NAME', 'ambiguous name: "' + expr.name + '"', expr.span.start, expr.span.end); }
    return;
  }
  if (isBinaryExpr(expr)) { resolveInExpr(expr.left, scope, ctx); resolveInExpr(expr.right, scope, ctx); }
  else if (isUnaryExpr(expr)) { resolveInExpr(expr.operand, scope, ctx); }
  else if (isListExpr(expr)) { for (const el of expr.elements) resolveInExpr(el, scope, ctx); }
  else if (isRecordExpr(expr)) { for (const f of expr.fields) resolveInExpr(f.value, scope, ctx); }
}
export function bindProgramSymbols(program: ProgramNode, moduleNode?: ModuleNode): BindingResult { return bindProgram(program, moduleNode); }
