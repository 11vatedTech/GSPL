/**
 * Token — the lexer's output unit. Wraps a green token with trivia and span.
 * Prompt 3 §12, §13.
 */
import type { SourceDocument, SourceSpan, Diagnostic } from '../../text-source/src/index.js';
import type { GreenToken, GreenTrivia } from '../../syntax-tree/src/index.js';

export type SemanticValue = string | bigint | number | boolean | null;

export interface Token {
  readonly greenToken: GreenToken;
  readonly leadingTrivia: readonly GreenTrivia[];
  readonly trailingTrivia: readonly GreenTrivia[];
  readonly span: SourceSpan;
  readonly semanticValue?: SemanticValue;
}

export interface LexerStatistics {
  readonly tokenCount: number;
  readonly triviaCount: number;
  readonly diagnosticCount: number;
  readonly identifierCount: number;
  readonly literalCount: number;
  readonly keywordCount: number;
  readonly operatorCount: number;
  readonly punctuationCount: number;
  readonly commentCount: number;
  readonly invalidCount: number;
  readonly lineCount: number;
  readonly maxTokenLength: number;
  readonly totalTokenWidth: number;
  readonly totalTriviaWidth: number;
  readonly elapsedMs: number;
}

export interface LexResult {
  readonly source: SourceDocument;
  readonly tokens: readonly Token[];
  readonly diagnostics: readonly Diagnostic[];
  readonly statistics: LexerStatistics;
  readonly complete: boolean;
}
