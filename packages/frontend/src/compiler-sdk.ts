/**
 * Public Compiler SDK — Prompt 3 §9.
 * Single entrypoint for the complete frontend pipeline.
 * No global state; all caches scoped to CompilerContext.
 */
import { parseText, parseSource, type ParseResult, type ParseOptions, DEFAULT_PARSE_OPTIONS } from "@gspl/parser";
import type { SyntaxTree } from "@gspl/syntax-tree";
import type { Diagnostic, SourceDocument } from "@gspl/text-source";
import type { CanonicalSeed } from "@gspl/seed-format";
import type { GsplIrGraph, ProvenanceRecord } from "@gspl/ir-model";
import { lowerToAst } from "./ast-lowering.js";
import type { AstLoweringResult } from "./ast-types.js";
import { bindProgramSymbols, type BindingResult } from "./binding.js";
import { createTypeEnvironment, validateStructure, type TypeEnvironment, type StructuralValidationResult } from "./type-analysis.js";
import { lowerToAuthoring, type AuthoringProgram } from "./authoring.js";
import { lowerToCanonicalSeed, type CanonicalLoweringOptions, type CanonicalLoweringResult, DEFAULT_LOWERING_OPTIONS } from "./canonical-lowering.js";
import { compileAuthoringToIr, lowerToIr, type IrLoweringOptions, type IrLoweringResult, DEFAULT_IR_OPTIONS } from "./ir-lowering.js";
import { formatSource, formatSyntaxTree, checkFormatting, type FormatOptions, type FormatResult, DEFAULT_FORMAT_OPTIONS } from "./formatter.js";
import type { ProgramNode, AstNodeId } from "./ast-types.js";
import * as fsSync from "node:fs";

export interface FrontendCompilerContext {
  readonly languageVersion: string;
  readonly sourceRoot?: string;
  readonly parseOptions: ParseOptions;
  readonly lowerOptions: CanonicalLoweringOptions;
  readonly irOptions: IrLoweringOptions;
  readonly formatOptions: FormatOptions;
}

export interface CompileResult {
  readonly source: SourceDocument;
  readonly parseResult: ParseResult;
  readonly ast: AstLoweringResult;
  readonly binding: BindingResult;
  readonly typeEnv: TypeEnvironment;
  readonly typeValidation: StructuralValidationResult;
  readonly authoring: AuthoringProgram;
  readonly canonical: CanonicalLoweringResult;
  readonly ir: IrLoweringResult;
  readonly formatted: FormatResult;
  readonly allDiagnostics: readonly Diagnostic[];
}

export function createFrontendCompiler(overrides?: Partial<FrontendCompilerContext>): FrontendCompilerContext {
  return {
    languageVersion: overrides?.languageVersion || "gspl-text/1.0",
    sourceRoot: overrides?.sourceRoot,
    parseOptions: overrides?.parseOptions || DEFAULT_PARSE_OPTIONS,
    lowerOptions: overrides?.lowerOptions || { ...DEFAULT_LOWERING_OPTIONS, languageVersion: overrides?.languageVersion || "gspl-text/1.0" },
    irOptions: overrides?.irOptions || { ...DEFAULT_IR_OPTIONS, languageVersion: overrides?.languageVersion || "gspl-text/1.0" },
    formatOptions: overrides?.formatOptions || DEFAULT_FORMAT_OPTIONS,
  };
}

export function compile(ctx: FrontendCompilerContext, source: SourceDocument): CompileResult {
  var parseResult = parseSource(source, ctx.parseOptions);
  var ast = lowerToAst(parseResult.root, ctx.languageVersion, parseResult.diagnostics);
  var binding = bindProgramSymbols(ast.program);
  var typeEnv = createTypeEnvironment();
  var typeValidation = validateStructure(ast.program, typeEnv);
  var authoring = lowerToAuthoring(ast.program, binding, typeEnv, "<compile>");
  var canonical = lowerToCanonicalSeed(authoring, ctx.lowerOptions);
  var ir = lowerToIr(canonical, ctx.irOptions);
  var formatted = formatSyntaxTree(parseResult.root, ctx.formatOptions);
  var allDiagnostics = [
    ...parseResult.diagnostics,
    ...binding.diagnostics,
    ...typeValidation.diagnostics,
    ...canonical.diagnostics,
    ...ir.diagnostics,
    ...formatted.diagnostics,
  ];
  return { source, parseResult, ast, binding, typeEnv, typeValidation, authoring, canonical, ir, formatted, allDiagnostics };
}

export function compileText(ctx: FrontendCompilerContext, logicalPath: string, text: string): CompileResult {
  var parseResult = parseText(logicalPath, text, ctx.parseOptions);
  var ast = lowerToAst(parseResult.root, ctx.languageVersion, parseResult.diagnostics);
  var binding = bindProgramSymbols(ast.program);
  var typeEnv = createTypeEnvironment();
  var typeValidation = validateStructure(ast.program, typeEnv);
  var authoring = lowerToAuthoring(ast.program, binding, typeEnv, logicalPath);
  var canonical = lowerToCanonicalSeed(authoring, ctx.lowerOptions);
  var ir = lowerToIr(canonical, ctx.irOptions);
  var formatted = formatSyntaxTree(parseResult.root, ctx.formatOptions);
  var allDiagnostics = [
    ...parseResult.diagnostics,
    ...binding.diagnostics,
    ...typeValidation.diagnostics,
    ...canonical.diagnostics,
    ...ir.diagnostics,
    ...formatted.diagnostics,
  ];
  return {
    source: parseResult.root as any,
    parseResult, ast, binding, typeEnv, typeValidation, authoring, canonical, ir, formatted, allDiagnostics
  };
}

export function compileFile(ctx: FrontendCompilerContext, filePath: string): CompileResult {
  var text = fsSync.readFileSync(filePath, "utf-8");
  return compileText(ctx, filePath, text);
}
