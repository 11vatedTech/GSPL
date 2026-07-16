/**
 * @gspl/lexer — production lexer. Prompt 3 Sections 12-21.
 */
export type { Token, LexResult, LexerStatistics, LexerOperationalMetrics, SemanticValue } from './token.js';
export type { LexerOptions } from './lexer.js';
export { lexSource } from './lexer.js';
export { scanNumericLiteral, type NumericScanResult, type NumericScannerOptions } from './lex-numeric.js';
export { scanStringLiteral, type StringScanResult, type StringScannerOptions } from './lex-string.js';
export { scanLineComment, scanBlockComment, scanWhitespace, type TriviaScanResult, type CommentScannerOptions } from './lex-comment.js';
export { scanIdentifierOrKeyword, scanPunctuationOrOperator, resolveKind, type IdentifierScanResult, type PunctOpResult } from './keyword.js';
export { validateTokenStream, type TokenStreamValidationResult } from './validate.js';
export {
  LEXICAL_CONTRACT,
  KEYWORD_TABLE,
  LITERAL_TABLE,
  PUNCTUATION_TABLE,
  OPERATOR_TABLE,
  LEXER_DIAGNOSTIC_TABLE,
} from './lexical-contract.js';
export {
  LITERAL_KINDS,
  resolveLanguageProfile,
  lookupKeywordOrLiteral,
  type LexicalLanguageProfile,
  type LexicalDiagnostics,
  type LanguageProfileResolution,
} from './lang-profile.js';
