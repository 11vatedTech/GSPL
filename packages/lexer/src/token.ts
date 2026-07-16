/**
 * Token, LexResult, deterministic and operational statistics.
 * Prompt 3 Section 12, 13, 15.
 */
import type { SourceDocument, SourceSpan, Diagnostic } from '@gspl/text-source';
import type { GreenToken, GreenTrivia } from '@gspl/syntax-tree';

export type SemanticValue = string | bigint | number | boolean | null;

export interface Token {
  readonly greenToken: GreenToken;
  readonly leadingTrivia: readonly GreenTrivia[];
  readonly trailingTrivia: readonly GreenTrivia[];
  readonly span: SourceSpan;
  readonly semanticValue?: SemanticValue;
}

/** Deterministic — reproducible from source bytes and the lexical profile. */
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
}

/** Operational metrics. NEVER participate in deterministic JSON/hashing. */
export interface LexerOperationalMetrics {
  readonly elapsedMs: number;
}

export interface LexResult {
  readonly source: SourceDocument;
  readonly tokens: readonly Token[];
  readonly diagnostics: readonly Diagnostic[];
  readonly statistics: LexerStatistics;
  readonly operational?: LexerOperationalMetrics;
  readonly complete: boolean;
}
