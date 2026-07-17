/**
 * Token, LexResult, deterministic and operational statistics.
 * Prompt 3 Sections 12, 13, 15 + Final Closure §5 + Final Unlock §6, §7.
 *
 * `SemanticValue` is a closed discriminated union. Every variant carries
 * a unique `kind` tag for exhaustive type-guarding. Identifier tokens
 * — ASCII OR non-ASCII — always carry `IdentifierLexicalValue`
 * metadata so downstream consumers can recover normalized identities
 * uniformly without re-running the Unicode profile analysis.
 */
import type { SourceDocument, SourceSpan, Diagnostic, IdentifierIdentity, UnicodeSecurityCode, UnicodeSecurityFinding } from '@gspl/text-source';
import type { GreenToken, GreenTrivia } from '@gspl/syntax-tree';

/**
 * Identifier canonical form exposed by the lexer (Final Unlock §6).
 * Every identifier (ASCII or not) carries this metadata. Plain-ASCII
 * identifiers yield `scripts=['Latin']`, `findings=[]`, an ASCII
 * confusable skeleton, and the exact source spelling as both original
 * and normalized fields.
 */
export interface IdentifierLexicalValue {
  readonly kind: 'identifier';
  readonly identity: IdentifierIdentity;
  readonly findings: readonly UnicodeSecurityFinding[];
}

export interface IntegerLexicalValue {
  readonly kind: 'integer';
  readonly value: bigint;
}
export interface DecimalFloatLexicalValue {
  readonly kind: 'decimal-float';
  readonly value: string;
  readonly negativeZero: boolean;
}
export interface StringLexicalValue {
  readonly kind: 'string';
  readonly value: string;
}
export interface BooleanLexicalValue {
  readonly kind: 'boolean';
  readonly value: boolean;
}
export interface AbsenceLexicalValue {
  readonly kind: 'absence';
}

/** Closed discriminated union — Final Unlock §7. */
export type SemanticValue =
  | IntegerLexicalValue
  | DecimalFloatLexicalValue
  | StringLexicalValue
  | BooleanLexicalValue
  | AbsenceLexicalValue
  | IdentifierLexicalValue;

/* Exhaustive type-guards (compile-time exhaustiveness consumers rely on). */
export function isIdentifierLexicalValue(v: SemanticValue): v is IdentifierLexicalValue {
  return v.kind === 'identifier';
}
export function isIntegerLexicalValue(v: SemanticValue): v is IntegerLexicalValue {
  return v.kind === 'integer';
}
export function isDecimalFloatLexicalValue(v: SemanticValue): v is DecimalFloatLexicalValue {
  return v.kind === 'decimal-float';
}
export function isStringLexicalValue(v: SemanticValue): v is StringLexicalValue {
  return v.kind === 'string';
}
export function isBooleanLexicalValue(v: SemanticValue): v is BooleanLexicalValue {
  return v.kind === 'boolean';
}
export function isAbsenceLexicalValue(v: SemanticValue): v is AbsenceLexicalValue {
  return v.kind === 'absence';
}

/** Canonical, insertion-order-independent JSON serialization (Final Unlock §7). */
export function serializeSemanticValueCanonical(v: SemanticValue): string {
  switch (v.kind) {
    case 'identifier':
      return JSON.stringify({
        kind: 'identifier',
        identity: {
          original: v.identity.original,
          normalized: v.identity.normalized,
          confusableSkeleton: v.identity.confusableSkeleton,
          scripts: [...v.identity.scripts].sort(),
        },
        findings: v.findings.map((f) => ({ code: f.code, offset: f.offset, character: f.character, message: f.message })),
      });
    case 'integer':
      return JSON.stringify({ kind: 'integer', value: v.value.toString() });
    case 'decimal-float':
      return JSON.stringify({ kind: 'decimal-float', value: v.value, negativeZero: v.negativeZero });
    case 'string':
      return JSON.stringify({ kind: 'string', value: v.value });
    case 'boolean':
      return JSON.stringify({ kind: 'boolean', value: v.value });
    case 'absence':
      return JSON.stringify({ kind: 'absence' });
    default: {
      const exhaustiveCheck: never = v;
      void exhaustiveCheck;
      return JSON.stringify({ kind: 'unknown' });
    }
  }
}

export interface Token {
  readonly greenToken: GreenToken;
  readonly leadingTrivia: readonly GreenTrivia[];
  readonly trailingTrivia: readonly GreenTrivia[];
  readonly span: SourceSpan;
  readonly semanticValue?: SemanticValue;
  /** Original source spelling (Final Unlock §6 — recoverable for keywords/literals). */
  readonly spelling?: string;
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
