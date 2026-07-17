/**
 * Parser types -- ParseOptions, ParseResult, ParserLimits.
 * Prompt 3 §9.1, §9.2.
 */
import type { SourceDocument, Diagnostic, SourceId } from '@gspl/text-source';
import type { Token, LexResult } from '@gspl/lexer';
import type { SyntaxTree } from '@gspl/syntax-tree';

export interface ParserLimits {
  readonly maxNestingDepth: number;
  readonly maxNodeCount: number;
  readonly maxParserDiagnostics: number;
  readonly maxExpressionDepth: number;
  readonly maxTypeDepth: number;
  readonly maxListLength: number;
  readonly maxDeclarationCount: number;
  readonly maxRecoverySkips: number;
}

export const DEFAULT_PARSER_LIMITS: ParserLimits = {
  maxNestingDepth: 256,
  maxNodeCount: 100_000,
  maxParserDiagnostics: 500,
  maxExpressionDepth: 64,
  maxTypeDepth: 32,
  maxListLength: 10_000,
  maxDeclarationCount: 10_000,
  maxRecoverySkips: 1000,
};

export type RecoveryMode = 'strict' | 'recover';

export interface ParseOptions {
  readonly languageVersion: string;
  readonly limits: ParserLimits;
  readonly recoveryMode: RecoveryMode;
}

export const DEFAULT_PARSE_OPTIONS: ParseOptions = {
  languageVersion: 'gspl-text/1.0',
  limits: DEFAULT_PARSER_LIMITS,
  recoveryMode: 'recover',
};

export interface DeterministicParserStatistics {
  readonly nodeCount: number;
  readonly tokenCount: number;
  readonly diagnosticCount: number;
  readonly declarationCount: number;
  readonly expressionCount: number;
  readonly maxDepth: number;
  readonly recoveryActionCount: number;
  readonly missingTokenCount: number;
  readonly skippedTokenCount: number;
}

export interface ParserOperationalMetrics {
  readonly elapsedMs: number;
}

export interface ParseResult {
  readonly source: SourceDocument;
  readonly tokenStream: readonly Token[];
  readonly root: SyntaxTree;
  readonly diagnostics: readonly Diagnostic[];
  readonly statistics: DeterministicParserStatistics;
  readonly operational?: ParserOperationalMetrics;
  readonly complete: boolean;
}
