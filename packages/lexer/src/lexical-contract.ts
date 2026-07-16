
/**
 * Lexical Contract Registry — single authoritative machine-readable declaration
 * of the GSPL lexical surface for the gspl-text/1.0 language version.
 * Prompt 3 Section 19.
 *
 * This is intentionally hand-maintained to be auditable. The
 * check:lexical-grammar script compares this registry against the
 * embedded normative metadata in docs/specification/GSPL_LEXICAL_GRAMMAR.md.
 */

export const LEXICAL_CONTRACT = {
  languageVersion: 'gspl-text/1.0',
  unicodeProfile: 'gspl-v1',
  unicodeVersion: '15.1.0',
  normalizationForm: 'NFC',
  nestedBlockComments: true,
  commentDelimiters: {
    lineComment: '//',
    blockCommentOpen: '/*',
    blockCommentClose: '*/',
    documentationOpen: '/**',
  },
  stringDelimiters: {
    escaped: { open: '"', close: '"' },
    raw: { prefix: 'r', open: '"', close: '"' },
    multiline: { open: '"""', close: '"""' },
  },
  newlineForms: ['LF', 'CRLF', 'CR', 'U+2028', 'U+2029'],
  nestedCommentPolicy:
    'Configured by LexerOptions.nestedBlockComments; default true. Limit depth comes from SourceLimits.maxCommentNestingDepth.',
} as const;

export const KEYWORD_TABLE: ReadonlyArray<readonly [string, string]> = [
  ['allow', 'AllowKeyword'],
  ['as', 'AsKeyword'],
  ['budget', 'BudgetKeyword'],
  ['capability', 'CapabilityKeyword'],
  ['channel', 'ChannelKeyword'],
  ['clock', 'ClockKeyword'],
  ['compatibility', 'CompatibilityKeyword'],
  ['constraints', 'ConstraintsKeyword'],
  ['deny', 'DenyKeyword'],
  ['domain', 'DomainKeyword'],
  ['edge', 'EdgeKeyword'],
  ['effects', 'EffectsKeyword'],
  ['environment', 'EnvironmentKeyword'],
  ['equivalence', 'EquivalenceKeyword'],
  ['export', 'ExportKeyword'],
  ['extension', 'ExtensionKeyword'],
  ['filesystem', 'FilesystemKeyword'],
  ['forbid', 'ForbidKeyword'],
  ['gene', 'GeneKeyword'],
  ['goal', 'GoalKeyword'],
  ['graph', 'GraphKeyword'],
  ['id', 'IdKeyword'],
  ['import', 'ImportKeyword'],
  ['invariant', 'InvariantKeyword'],
  ['lineage', 'LineageKeyword'],
  ['local', 'LocalKeyword'],
  ['model_inference', 'ModelInferenceKeyword'],
  ['network', 'NetworkKeyword'],
  ['node', 'NodeKeyword'],
  ['non_goal', 'NonGoalKeyword'],
  ['optional', 'OptionalKeyword'],
  ['private', 'PrivateKeyword'],
  ['process', 'ProcessKeyword'],
  ['provenance', 'ProvenanceKeyword'],
  ['purpose', 'PurposeKeyword'],
  ['read_only', 'ReadOnlyKeyword'],
  ['require', 'RequireKeyword'],
  ['requires', 'RequiresKeyword'],
  ['root', 'RootKeyword'],
  ['schema', 'SchemaKeyword'],
  ['seed', 'SeedKeyword'],
  ['stream', 'StreamKeyword'],
  ['target', 'TargetKeyword'],
  ['title', 'TitleKeyword'],
  ['validation', 'ValidationKeyword'],
  ['version', 'VersionKeyword'],
  ['confidence', 'ConfidenceKeyword'],
  ['algorithm', 'AlgorithmKeyword'],
];

export const LITERAL_TABLE: ReadonlyArray<readonly [string, string]> = [
  ['true', 'BooleanLiteral'],
  ['false', 'BooleanLiteral'],
  ['none', 'AbsenceLiteral'],
];

export const PUNCTUATION_TABLE: ReadonlyArray<readonly [string, string]> = [
  ['(', 'LeftParen'],
  [')', 'RightParen'],
  ['[', 'LeftBracket'],
  [']', 'RightBracket'],
  ['{', 'LeftBrace'],
  ['}', 'RightBrace'],
  [',', 'Comma'],
  [';', 'Semicolon'],
  ['.', 'Dot'],
  ['..', 'DotDot'],
  [':', 'Colon'],
  ['::', 'DoubleColon'],
  ['@', 'At'],
  ['?', 'Question'],
  ['->', 'Arrow'],
];

export const OPERATOR_TABLE: ReadonlyArray<readonly [string, string]> = [
  ['=', 'Assign'],
  ['==', 'EqualEqual'],
  ['!=', 'BangEqual'],
  ['+', 'Plus'],
  ['-', 'Minus'],
  ['*', 'Star'],
  ['/', 'Slash'],
  ['%', 'Percent'],
  ['!', 'Bang'],
  ['<', 'Less'],
  ['<=', 'LessEqual'],
  ['>', 'Greater'],
  ['>=', 'GreaterEqual'],
  ['&&', 'LogicalAnd'],
  ['||', 'LogicalOr'],
];

/**
 * Every diagnostic code that the lexer layer may emit.
 * check:token-coverage ensures each has a triggering regression test.
 */
export const LEXER_DIAGNOSTIC_TABLE: ReadonlyArray<string> = [
  'GSPL-LEX-INVALID-CHARACTER',
  'GSPL-LEX-TOKEN-LIMIT',
  'GSPL-LEX-DIAGNOSTIC-LIMIT',
  'GSPL-LEX-COMMENT-LIMIT',
  'GSPL-LEX-STRING-TOO-LARGE',
  'GSPL-LEX-STRING-LIMIT',
  'GSPL-LEX-IDENTIFIER-TOO-LARGE',
  'GSPL-LEX-UNTERMINATED-STRING',
  'GSPL-LEX-UNTERMINATED-BLOCK-COMMENT',
  'GSPL-LEX-INVALID-ESCAPE',
  'GSPL-LEX-INVALID-UNICODE-ESCAPE',
  'GSPL-LEX-INVALID-INTEGER',
  'GSPL-LEX-INVALID-FLOAT',
  'GSPL-LEX-INVALID-DIGIT-SEPARATOR',
  'GSPL-LEX-NUMERIC-TOO-LARGE',
  'GSPL-LEX-NONFINITE-NUMERIC',
  'GSPL-LEX-COMMENT-TOO-LARGE',
  'GSPL-LEX-COMMENT-NESTING-LIMIT',
  'GSPL-LEX-COMMENT-NESTING-DISABLED',
  'GSPL-SOURCE-NONNORMALIZED-IDENTIFIER',
  'GSPL-SOURCE-MIXED-SCRIPT-IDENTIFIER',
  'GSPL-SOURCE-CONFUSABLE-IDENTIFIER',
  'GSPL-SOURCE-ZERO-WIDTH',
  'GSPL-SOURCE-BIDI-CONTROL',
  'GSPL-SOURCE-UNPAIRED-SURROGATE',
  'GSPL-SOURCE-DEFAULT-IGNORABLE',
  'GSPL-SOURCE-AMBIGUOUS-WHITESPACE',
  'GSPL-LEX-UNSUPPORTED-LANGUAGE-VERSION',
];
