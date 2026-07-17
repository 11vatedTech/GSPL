/**
 * @gspl/parser -- deterministic recursive descent + Pratt parser.
 * Prompt 3 §9.
 */
export type { ParseOptions, ParseResult, ParserLimits, RecoveryMode, DeterministicParserStatistics, ParserOperationalMetrics } from './types.js';
export { DEFAULT_PARSE_OPTIONS, DEFAULT_PARSER_LIMITS } from './types.js';
export { parseSource, parseText, parseTokens } from './parser.js';
