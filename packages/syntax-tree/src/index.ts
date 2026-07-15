/**
 * @gspl/syntax-tree — minimal immutable green-token primitives.
 * Prompt 3 §22. Full parser/CST is the next slice.
 */
export { SyntaxKind, KEYWORD_KINDS, PUNCTUATION_KINDS, OPERATOR_KINDS, isKeyword, isTrivia } from './syntax-kind.js';
export { GreenToken, stableHashFor, type GreenTokenData } from './green-token.js';
export { GreenTrivia, type GreenTriviaData } from './trivia.js';
