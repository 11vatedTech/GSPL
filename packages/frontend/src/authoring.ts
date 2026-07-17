/** Authoring representation - stable projection between AST and canonical seed.
 * Prompt 3 §15. Preserves author intent, resolves sugar, normalizes names.
 */
import type { SourceSpan, Diagnostic } from "@gspl/text-source";
import type { AstNodeId, ProgramNode, SeedDeclNode, GeneDeclNode, TargetDeclNode, ExtensionDeclNode, SimpleClauseNode, ExprNode, TypeNode } from "./ast-types.js";
import { AstKind, isLiteralExpr, isIdentifierExpr } from "./ast-types.js";
import type { BindingResult, Symbol } from "./binding.js";
import { SymbolKind } from "./binding.js";
import type { Type, TypeEnvironment } from "./type-analysis.js";

export interface AuthoringProgram {
  readonly languageVersion: string;
  readonly seed: AuthoringSeed | undefined;
  readonly topLevelGenes: readonly AuthoringGene[];
  readonly imports: readonly AuthoringImport[];
  readonly exports: readonly string[];
  readonly diagnostics: readonly Diagnostic[];
  readonly provenance: AuthoringProvenance;
}
export interface AuthoringProvenance { readonly sourceModule: string; readonly sourceId: string; readonly nodeCount: number; readonly symbolCount: number; readonly typeCount: number; }
export interface AuthoringSeed { readonly version: string|undefined; readonly genes: readonly AuthoringGene[]; readonly targets: readonly AuthoringTarget[]; readonly extensions: readonly AuthoringExtension[]; readonly clauses: readonly AuthoringClause[]; readonly constraints: readonly AuthoringClause[]; readonly entropy: readonly AuthoringClause[]; readonly effects: readonly AuthoringClause[]; readonly budget: readonly AuthoringClause[]; }
export interface AuthoringGene { readonly astId: AstNodeId; readonly name: string; readonly normalizedName: string; readonly isPrivate: boolean; readonly declaredType: string; readonly resolvedType: string; readonly value: AuthoringValue|undefined; readonly confidence: number|undefined; readonly sourceSpan: SourceSpan; }
export interface AuthoringTarget { readonly name: string|undefined; readonly targetType: string|undefined; readonly clauses: readonly AuthoringClause[]; }
export interface AuthoringExtension { readonly name: string|undefined; readonly parameters: readonly{name:string;type:string}[]; readonly returnType: string; readonly value: AuthoringValue|undefined; }
export interface AuthoringClause { readonly keyword: string; readonly value: string|undefined; }
export interface AuthoringImport { readonly path: string; readonly alias: string|undefined; }
export type AuthoringValue = {readonly kind:"literal";readonly literalKind:string;readonly text:string}|{readonly kind:"identifier";readonly name:string;readonly resolvedSymbol?:string}|{readonly kind:"binary";readonly operator:string;readonly left:AuthoringValue;readonly right:AuthoringValue}|{readonly kind:"unary";readonly operator:string;readonly operand:AuthoringValue}|{readonly kind:"list";readonly elements:readonly AuthoringValue[]}|{readonly kind:"record";readonly fields:readonly{name:string;value:AuthoringValue}[]}|{readonly kind:"unknown"};
export function lowerToAuthoring(program: ProgramNode, binding: BindingResult, types: TypeEnvironment, sourceModule: string): AuthoringProgram {
  var diags: Diagnostic[] = [...binding.diagnostics];
  var authSeed: AuthoringSeed | undefined;
  if (program.seed) authSeed = lowerSeed(program.seed);
  var authGenes: AuthoringGene[] = [];
  for (var i = 0; i < program.topLevelGenes.length; i++) authGenes.push(lowerGene(program.topLevelGenes[i]));
  var imports: AuthoringImport[] = [];
  for (var j = 0; j < program.imports.length; j++) { var imp = program.imports[j]; imports.push({ path: imp.path, alias: imp.alias }); }
  var exports: string[] = [];
  for (var k = 0; k < program.exports.length; k++) { for (var m = 0; m < program.exports[k].names.length; m++) exports.push(program.exports[k].names[m]); }
  return { languageVersion: program.languageVersion, seed: authSeed, topLevelGenes: authGenes, imports: imports, exports: exports, diagnostics: diags, provenance: { sourceModule: sourceModule, sourceId: program.id.toString(), nodeCount: authSeed ? authSeed.genes.length : 0, symbolCount: binding.symbolCount, typeCount: types.typeCount }};
}
function lowerSeed(seed: SeedDeclNode): AuthoringSeed {
  var genes: AuthoringGene[] = []; for (var i=0;i<seed.genes.length;i++) genes.push(lowerGene(seed.genes[i]));
  var targets: AuthoringTarget[] = []; for (var j=0;j<seed.targets.length;j++) targets.push(lowerTarget(seed.targets[j]));
  var extensions: AuthoringExtension[] = []; for (var k=0;k<seed.extensions.length;k++) extensions.push(lowerExtension(seed.extensions[k]));
  var clauses: AuthoringClause[] = []; for (var m=0;m<seed.clauses.length;m++) clauses.push(lowerClause(seed.clauses[m]));
  var constraints: AuthoringClause[] = []; if (seed.constraints) for (var n=0;n<seed.constraints.clauses.length;n++) constraints.push(lowerClause(seed.constraints.clauses[n]));
  var entropy: AuthoringClause[] = []; if (seed.entropy) for (var o=0;o<seed.entropy.clauses.length;o++) entropy.push(lowerClause(seed.entropy.clauses[o]));
  var effects: AuthoringClause[] = []; if (seed.effects) for (var p=0;p<seed.effects.clauses.length;p++) effects.push(lowerClause(seed.effects.clauses[p]));
  var budget: AuthoringClause[] = []; if (seed.budget) for (var q=0;q<seed.budget.clauses.length;q++) budget.push(lowerClause(seed.budget.clauses[q]));
  return { version: seed.version, genes, targets, extensions, clauses, constraints, entropy, effects, budget };
}
function lowerGene(gene: GeneDeclNode): AuthoringGene {
  var typeStr = ''; var resolvedStr = 'any';
  if (gene.typeAnnotation) { typeStr = typeAnnotationStr(gene.typeAnnotation); }
  return { astId: gene.id, name: gene.name, normalizedName: gene.name.toLowerCase(), isPrivate: gene.isPrivate, declaredType: typeStr, resolvedType: resolvedStr, value: gene.value ? lowerValue(gene.value) : undefined, confidence: gene.confidence, sourceSpan: gene.span };
}
function lowerTarget(target: TargetDeclNode): AuthoringTarget {
  var clauses: AuthoringClause[] = []; for (var i=0;i<target.clauses.length;i++) clauses.push(lowerClause(target.clauses[i]));
  return { name: target.name, targetType: target.targetType, clauses };
}
function lowerExtension(ext: ExtensionDeclNode): AuthoringExtension {
  var params:{name:string;type:string}[] = [];
  for (var i=0;i<ext.parameters.length;i++) { var p=ext.parameters[i]; params.push({name:p.name,type:p.type?typeAnnotationStr(p.type):'any'}); }
  return { name: ext.name, parameters: params, returnType: ext.returnType ? typeAnnotationStr(ext.returnType) : 'any', value: ext.value ? lowerValue(ext.value) : undefined };
}
function lowerClause(clause: SimpleClauseNode): AuthoringClause { return { keyword: clause.keyword, value: clause.value }; }
function typeAnnotationStr(node: TypeNode): string {
  if (node.kind === AstKind.NamedType) { var n = node as any; return n.name; }
  if (node.kind === AstKind.ListType) { var l = node as any; return '[' + typeAnnotationStr(l.elementType) + ']'; }
  return 'type';
}
function lowerValue(expr: ExprNode): AuthoringValue {
  if (isLiteralExpr(expr)) return { kind: 'literal', literalKind: expr.literalKind, text: expr.value };
  if (isIdentifierExpr(expr)) return { kind: 'identifier', name: expr.name, resolvedSymbol: expr.name };
  var b = expr as any;
  if (b.left && b.right && b.operator) return { kind: 'binary', operator: b.operator, left: lowerValue(b.left), right: lowerValue(b.right) };
  if (b.operand && b.operator) return { kind: 'unary', operator: b.operator, operand: lowerValue(b.operand) };
  if (b.elements) { var el: AuthoringValue[] = []; for (var i=0;i<b.elements.length;i++) el.push(lowerValue(b.elements[i])); return { kind: 'list', elements: el }; }
  if (b.fields) { var fl:{name:string;value:AuthoringValue}[] = []; for (var j=0;j<b.fields.length;j++) fl.push({name:b.fields[j].name,value:lowerValue(b.fields[j].value)}); return { kind: 'record', fields: fl }; }
  return { kind: 'unknown' };
}
