/** Type analysis - Prompt 3 §14. */
import type { Diagnostic } from '@gspl/text-source';
import { makeDiagnostic } from '@gspl/text-source';
import type { AstNodeId, TypeNode, ProgramNode, GeneDeclNode, ExprNode } from './ast-types.js';
import { isNamedType, isListType, isMapType, isOptionalType, isLiteralExpr, isIdentifierExpr, isBinaryExpr, isUnaryExpr, isListExpr, isRecordExpr } from './ast-types.js';

export const enum TypeKind { Primitive = 1, List = 2, Map = 3, Optional = 4, Named = 5 }

export interface Type {
  readonly kind: TypeKind;
  readonly name: string;
  readonly inner?: Type;
  readonly elementType?: Type;
  readonly fields?: ReadonlyMap<string, Type>;
}

export function typeName(t: Type): string {
  if (t.kind === TypeKind.List && t.elementType) return '[' + typeName(t.elementType) + ']';
  if (t.kind === TypeKind.Optional && t.inner) return typeName(t.inner) + '?';
  if (t.kind === TypeKind.Map && t.fields) {
    var entries: string[] = [];
    t.fields.forEach(function(v: Type, k: string) { entries.push(k + ': ' + typeName(v)); });
    return '{ ' + entries.join(', ') + ' }';
  }
  return t.name;
}

export var PRIMITIVE_TYPES: ReadonlyMap<string, Type> = new Map([
  ['scalar', { kind: TypeKind.Primitive, name: 'scalar' }],
  ['integer', { kind: TypeKind.Primitive, name: 'integer' }],
  ['float', { kind: TypeKind.Primitive, name: 'float' }],
  ['string', { kind: TypeKind.Primitive, name: 'string' }],
  ['boolean', { kind: TypeKind.Primitive, name: 'boolean' }],
  ['absence', { kind: TypeKind.Primitive, name: 'absence' }],
  ['any', { kind: TypeKind.Primitive, name: 'any' }],
]);

export interface TypeEnvironment { readonly namedTypes: ReadonlyMap<string, Type>; readonly typeCount: number; }
export function createTypeEnvironment(): TypeEnvironment { return { namedTypes: new Map(PRIMITIVE_TYPES), typeCount: PRIMITIVE_TYPES.size }; }

export function resolveType(node: TypeNode, env: TypeEnvironment): { type: Type; diagnostics: Diagnostic[] } {
  var diags: Diagnostic[] = [];
  var t = resolveTypeNode(node, env, diags);
  return { type: t, diagnostics: diags };
}

function resolveTypeNode(node: TypeNode, env: TypeEnvironment, diags: Diagnostic[]): Type {
  if (isNamedType(node)) {
    var existing = env.namedTypes.get(node.name.toLowerCase());
    if (existing) return existing;
    diags.push(makeDiagnostic({ code: 'GSPL-TYPE-UNKNOWN-TYPE', message: 'unknown type: "' + node.name + '"', severity: 'error', span: { sourceId: 'src:type' as any, start: node.span.start, end: node.span.end }, category: 'type', phase: 'type', canonical: true }));
    return { kind: TypeKind.Primitive, name: node.name };
  }
  if (isListType(node)) { var el = resolveTypeNode(node.elementType, env, diags); return { kind: TypeKind.List, name: '[' + typeName(el) + ']', elementType: el }; }
  if (isMapType(node)) { var fields = new Map<string, Type>(); for (var i = 0; i < node.fields.length; i++) { var f = node.fields[i]; fields.set(f.name.toLowerCase(), resolveTypeNode(f.type, env, diags)); } return { kind: TypeKind.Map, name: '{ map }', fields: fields }; }
  if (isOptionalType(node)) { var inn = resolveTypeNode(node.inner, env, diags); return { kind: TypeKind.Optional, name: typeName(inn) + '?', inner: inn }; }
  return { kind: TypeKind.Primitive, name: 'unknown' };
}

export function isTypeCompatible(a: Type, b: Type): boolean {
  if (a.kind === TypeKind.Primitive && a.name === 'any') return true;
  if (b.kind === TypeKind.Primitive && b.name === 'any') return true;
  if (a.kind !== b.kind) return false;
  if (a.kind === TypeKind.Primitive) {
    var an = a.name.toLowerCase();
    var bn = b.name.toLowerCase();
    if (an === bn) return true;
    // scalar is the general numeric type, compatible with integer and float
    if (an === 'scalar' && (bn === 'integer' || bn === 'float')) return true;
    if (bn === 'scalar' && (an === 'integer' || an === 'float')) return true;
    return false;
  }
  if (a.kind === TypeKind.Optional) return a.inner && b.inner ? isTypeCompatible(a.inner, b.inner) : false;
  if (a.kind === TypeKind.List) return a.elementType && b.elementType ? isTypeCompatible(a.elementType, b.elementType) : false;
  if (a.kind === TypeKind.Map) { if (!a.fields || !b.fields) return false; var match = true; a.fields.forEach(function(at: Type, k: string) { var bt = b.fields!.get(k); if (!bt || !isTypeCompatible(at, bt)) match = false; }); return match && a.fields.size === b.fields.size; }
  return false;
}

export interface StructuralValidationResult { readonly ok: boolean; readonly diagnostics: readonly Diagnostic[]; readonly typeAssignments: ReadonlyMap<AstNodeId, Type>; }

export function validateStructure(program: ProgramNode, env: TypeEnvironment): StructuralValidationResult {
  var diags: Diagnostic[] = [];
  var ta = new Map<AstNodeId, Type>();
  var seed = program.seed;
  if (seed) { for (var i = 0; i < seed.genes.length; i++) validateGene(seed.genes[i], env, diags, ta); }
  for (var j = 0; j < program.topLevelGenes.length; j++) validateGene(program.topLevelGenes[j], env, diags, ta);
  diags.sort(function(a: Diagnostic, b: Diagnostic) { return a.span.start - b.span.start || a.span.end - b.span.end || a.code.localeCompare(b.code); });
  return { ok: diags.filter(function(d: Diagnostic) { return d.severity === 'error'; }).length === 0, diagnostics: diags, typeAssignments: ta };
}

function validateGene(gene: GeneDeclNode, env: TypeEnvironment, diags: Diagnostic[], ta: Map<AstNodeId, Type>): void {
  var dt: Type | undefined;
  if (gene.typeAnnotation) { var r = resolveType(gene.typeAnnotation, env); for (var i = 0; i < r.diagnostics.length; i++) diags.push(r.diagnostics[i]); dt = r.type; }
  if (gene.value) { var inf = inferExprType(gene.value, env, ta); ta.set(gene.id, inf); if (dt && !isTypeCompatible(dt, inf)) diags.push(makeDiagnostic({ code: 'GSPL-TYPE-MISMATCH', message: 'type mismatch for gene "' + gene.name + '": ' + typeName(dt) + ' vs ' + typeName(inf), severity: 'error', span: { sourceId: 'src:type' as any, start: gene.span.start, end: gene.span.end }, category: 'type', phase: 'type', canonical: true })); }
  else if (dt) ta.set(gene.id, dt);
}

function inferExprType(expr: ExprNode, env: TypeEnvironment, ta: ReadonlyMap<AstNodeId, Type>): Type {
  if (isLiteralExpr(expr)) { var k = expr.literalKind; if (k === 'integer') return { kind: TypeKind.Primitive, name: 'integer' }; if (k === 'float') return { kind: TypeKind.Primitive, name: 'float' }; if (k === 'string') return { kind: TypeKind.Primitive, name: 'string' }; if (k === 'boolean') return { kind: TypeKind.Primitive, name: 'boolean' }; if (k === 'absence') return { kind: TypeKind.Primitive, name: 'absence' }; return { kind: TypeKind.Primitive, name: 'any' }; }
  if (isIdentifierExpr(expr)) { var a = ta.get(expr.id); return a ? a : { kind: TypeKind.Primitive, name: 'any' }; }
  if (isBinaryExpr(expr)) { var l = inferExprType(expr.left, env, ta); return expr.operator === '+' || expr.operator === '-' || expr.operator === '*' || expr.operator === '/' || expr.operator === '%' ? l : { kind: TypeKind.Primitive, name: 'boolean' }; }
  if (isUnaryExpr(expr)) return inferExprType(expr.operand, env, ta);
  if (isListExpr(expr)) { var et: Type = expr.elements.length > 0 ? inferExprType(expr.elements[0], env, ta) : { kind: TypeKind.Primitive, name: 'any' }; return { kind: TypeKind.List, name: '[' + typeName(et) + ']', elementType: et }; }
  if (isRecordExpr(expr)) { var flds = new Map<string, Type>(); for (var i = 0; i < expr.fields.length; i++) { var f = expr.fields[i]; flds.set(f.name.toLowerCase(), inferExprType(f.value, env, ta)); } return { kind: TypeKind.Map, name: '{ map }', fields: flds }; }
  return { kind: TypeKind.Primitive, name: 'any' };
}
