/**
 * @gspl/lexer — production lexer. Prompt 3 Section 12-21.
 */
export type { Token, LexResult, LexerStatistics, SemanticValue } from './token.js';
export type { LexerOptions } from './lexer.js';
export { lexSource } from './lexer.js';
export { scanNumericLiteral, type NumericResult } from './lex-numeric.js';
export { scanStringLiteral, type StringResult } from './lex-string.js';
export { scanLineComment, scanBlockComment, scanWhitespace, type TriviaScanResult } from './lex-comment.js';
export { scanIdentifierOrKeyword, scanPunctuationOrOperator, type KeywordResult } from './keyword.js';
export { validateTokenStream, type TokenStreamValidationResult } from './validate.js';
