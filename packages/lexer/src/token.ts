/**
 * Token, LexResult, deterministic and operational statistics.
 * Prompt 3 Sections 12, 13, 15 + Final Closure §5.
 *
 * `SemanticValue` is a discriminated union. IdentifierLexicalValue carries
 * the analysed identity for non-ASCII identifiers (Prompt 3 Final Closure
 * §5) so downstream tooling can compare normalized identities without
 * re-running the Unicode profile analysis.
 */
import type { SourceDocument, SourceSpan, Diagnostic, IdentifierIdentity, UnicodeSecurityCode } from '@gspl/text-source';
import type { GreenToken, GreenTrivia } from '@gspl/syntax-tree';

/**
 * Identifier canonical form exposed by the lexer (Prompt 3 Final Closure §5).
 * Carries original spelling, normalized identity, confusable skeleton,
 * script set, and surface findings for tooling that needs the same
 * metadata without re-running identifier profiling.
 */
export interface IdentifierLexicalValue {
  readonly kind: 'identifier';
  readonly identity: IdentifierIdentity;
  readonly findings: readonly { readonly code: UnicodeSecurityCode; readonly message?: string }[];
}

/**
 * Discriminated value union. The discriminator field is preserved on numeric
 * literals and on identifier metadata so consumers can route on `kind`.
 */
export type SemanticValue =
  | { readonly kind: 'string'; readonly value: string }
  | { readonly kind: 'integer'; readonly value: bigint }
  | { readonly kind: 'decimal-float'; readonly value: string }
  | { readonly kind: 'boolean'; readonly value: boolean }
  | { readonly kind: 'absence' }
  | IdentifierLexicalValue;

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
  /** Bytes of trivia dropped because the configured aggregate limit was reached. */
  readonly skippedTriviaCodeUnits: number;
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
