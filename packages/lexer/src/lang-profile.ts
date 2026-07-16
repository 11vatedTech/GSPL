/**
 * Lexical Language Profile — resolved, immutable dispatch configuration for the
 * scanner hot loop. Prompt 3 Section 14 / Section 19.
 *
 * The LexerOptions.languageVersion input is resolved once at the entry point
 * of lexSource into a fully-typed dispatch object so the hot loop performs
 * no string comparisons. Keyword/literal recognition is delegated to the
 * single source of truth `KEYWORD_KINDS` in @gspl/syntax-tree so there is no
 * duplication (Prompt 3 §5).
 */
import { KEYWORD_KINDS, PUNCTUATION_KINDS, OPERATOR_KINDS, SyntaxKind } from '@gspl/syntax-tree';
import type { SourceLimits } from '@gspl/text-source';

/**
 * Boolean and absence literals. These share the keyword range in SyntaxKind
 * (KeywordTrue / KeywordFalse / KeywordNone) because they are reserved words in
 * the gspl-text/1.0 grammar.
 */
export const LITERAL_KINDS: ReadonlyMap<string, SyntaxKind> = new Map<string, SyntaxKind>([
  ['true', SyntaxKind.KeywordTrue],
  ['false', SyntaxKind.KeywordFalse],
  ['none', SyntaxKind.KeywordNone],
]);

export interface LexicalLanguageProfile {
  readonly version: string;
  readonly keywords: ReadonlyMap<string, SyntaxKind>;
  readonly literals: ReadonlyMap<string, SyntaxKind>;
  readonly operators: ReadonlyMap<string, SyntaxKind>;
  readonly punctuation: ReadonlyMap<string, SyntaxKind>;
  readonly allowNestedBlockComments: boolean;
  readonly maxCommentNestingDepth: number;
}

interface ProfileBody {
  readonly keywords: ReadonlyMap<string, SyntaxKind>;
  readonly literals: ReadonlyMap<string, SyntaxKind>;
  readonly operators: ReadonlyMap<string, SyntaxKind>;
  readonly punctuation: ReadonlyMap<string, SyntaxKind>;
  readonly allowNestedBlockComments: boolean;
}

/** Single registered language version. Extensions register new entries here. */
const PROFILE_BY_VERSION: ReadonlyMap<string, ProfileBody> = new Map<string, ProfileBody>([
  [
    'gspl-text/1.0',
    {
      keywords: KEYWORD_KINDS,
      literals: LITERAL_KINDS,
      operators: OPERATOR_KINDS,
      punctuation: PUNCTUATION_KINDS,
      allowNestedBlockComments: true,
    },
  ],
]);

const DEFAULT_MAX_COMMENT_NESTING_DEPTH = 64;

/** Stable structured diagnostic record. */
export interface LexicalDiagnostics {
  readonly code: 'GSPL-LEX-UNSUPPORTED-LANGUAGE-VERSION';
  readonly message: string;
}

export interface LanguageProfileResolution {
  readonly profile: LexicalLanguageProfile;
  readonly diagnostics: readonly LexicalDiagnostics[];
}

/**
 * Resolve a language version string into an immutable profile and any structured
 * diagnostics. When the requested version is unrecognised a single
 * `GSPL-LEX-UNSUPPORTED-LANGUAGE-VERSION` diagnostic is returned, and the
 * scanner is provided the gspl-text/1.0 fallback profile so it can still emit a
 * valid bounded result containing EOF (Prompt 3 §8).
 */
export function resolveLanguageProfile(
  version: string,
  limits: SourceLimits,
): LanguageProfileResolution {
  const body = PROFILE_BY_VERSION.get(version);
  if (body === undefined) {
    const fallback: LexicalLanguageProfile = {
      version,
      keywords: KEYWORD_KINDS,
      literals: LITERAL_KINDS,
      operators: OPERATOR_KINDS,
      punctuation: PUNCTUATION_KINDS,
      allowNestedBlockComments: true,
      maxCommentNestingDepth: limits.maxCommentNestingDepth ?? DEFAULT_MAX_COMMENT_NESTING_DEPTH,
    };
    const diagnostics: LexicalDiagnostics[] = [
      { code: 'GSPL-LEX-UNSUPPORTED-LANGUAGE-VERSION', message: 'unknown language version: ' + version + '; falling back to gspl-text/1.0' },
    ];
    return { profile: fallback, diagnostics };
  }
  return {
    profile: {
      ...body,
      version,
      maxCommentNestingDepth: limits.maxCommentNestingDepth ?? DEFAULT_MAX_COMMENT_NESTING_DEPTH,
    },
    diagnostics: [],
  };
}

/**
 * Look up a keyword or literal by exact lexeme. Returns null if not a reserved
 * word. This is the single authoritative recognition function — no other call
 * sites may classify true / false / none or any keyword by prefix or substring
 * (Prompt 3 §3 / §6).
 */
export function lookupKeywordOrLiteral(
  lexeme: string,
  profile: LexicalLanguageProfile,
): { kind: SyntaxKind; category: 'keyword' | 'literal' } | null {
  const k = profile.keywords.get(lexeme);
  if (k !== undefined) return { kind: k, category: 'keyword' };
  const l = profile.literals.get(lexeme);
  if (l !== undefined) return { kind: l, category: 'literal' };
  return null;
}
