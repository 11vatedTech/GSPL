/**
 * SyntaxKindClassification -- category of each SyntaxKind (Prompt 3 §8.4).
 *
 *   TOKEN          terminal token in the green tree
 *   TRIVIA         non-terminal whitespace or comment-like green child
 *   CST_NODE       non-terminal structural node that lowers to an AST node
 *   AST_LOWERABLE  syntactic sugar; lowers deterministically to canonical-seed
 *   CST_ONLY       passes through CST unchanged
 *   RECOVERY       synthesized by parser to recover from malformed source
 *   PARSER_ONLY    internal kind, must never escape into AST
 */
export const enum SyntaxKindClassification {
  TOKEN = 'TOKEN',
  TRIVIA = 'TRIVIA',
  CST_NODE = 'CST_NODE',
  AST_LOWERABLE = 'AST_LOWERABLE',
  CST_ONLY = 'CST_ONLY',
  RECOVERY = 'RECOVERY',
  PARSER_ONLY = 'PARSER_ONLY',
}

export interface ClassificationEntry {
  readonly classification: SyntaxKindClassification;
  readonly astEquivalent?: string;
  readonly note?: string;
}

import { SyntaxKind } from './syntax-kind.js';

export const SYNTAX_KIND_CLASSIFICATION: ReadonlyMap<SyntaxKind, ClassificationEntry> = new Map<SyntaxKind, ClassificationEntry>([
  [SyntaxKind.Unknown, { classification: SyntaxKindClassification.RECOVERY, note: 'fallback' }],
  [SyntaxKind.EndOfFile, { classification: SyntaxKindClassification.TOKEN, note: 'synthetic terminal' }],
  [SyntaxKind.Invalid, { classification: SyntaxKindClassification.RECOVERY, note: 'malformed source' }],
  [SyntaxKind.Identifier, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'Identifier' }],
  [SyntaxKind.IntegerLiteral, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'IntegerLiteral' }],
  [SyntaxKind.FloatLiteral, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'FloatLiteral' }],
  [SyntaxKind.StringLiteral, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'StringLiteral' }],
  [SyntaxKind.RawStringLiteral, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'StringLiteral' }],
  [SyntaxKind.MultilineStringLiteral, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'StringLiteral' }],
  [SyntaxKind.BooleanLiteral, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'BooleanLiteral' }],
  [SyntaxKind.AbsenceLiteral, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'AbsenceLiteral' }],
  [SyntaxKind.VersionLiteral, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'VersionLiteral' }],
  [SyntaxKind.PathLiteral, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'PathLiteral' }],
  [SyntaxKind.KeywordSeed, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'KeywordSeed' }],
  [SyntaxKind.KeywordTitle, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'KeywordTitle' }],
  [SyntaxKind.KeywordVersion, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'KeywordVersion' }],
  [SyntaxKind.KeywordDomain, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'KeywordDomain' }],
  [SyntaxKind.KeywordId, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'KeywordId' }],
  [SyntaxKind.KeywordRequires, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'KeywordRequires' }],
  [SyntaxKind.KeywordOptional, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'KeywordOptional' }],
  [SyntaxKind.KeywordIntent, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'KeywordIntent' }],
  [SyntaxKind.KeywordPurpose, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'KeywordPurpose' }],
  [SyntaxKind.KeywordGoal, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'KeywordGoal' }],
  [SyntaxKind.KeywordNonGoal, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'KeywordNonGoal' }],
  [SyntaxKind.KeywordImport, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'KeywordImport' }],
  [SyntaxKind.KeywordLocal, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'KeywordLocal' }],
  [SyntaxKind.KeywordAs, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'KeywordAs' }],
  [SyntaxKind.KeywordExport, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'KeywordExport' }],
  [SyntaxKind.KeywordPrivate, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'KeywordPrivate' }],
  [SyntaxKind.KeywordGene, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'KeywordGene' }],
  [SyntaxKind.KeywordConfidence, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'KeywordConfidence' }],
  [SyntaxKind.KeywordInvariant, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'KeywordInvariant' }],
  [SyntaxKind.KeywordConstraints, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'KeywordConstraints' }],
  [SyntaxKind.KeywordRequire, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'KeywordRequire' }],
  [SyntaxKind.KeywordForbid, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'KeywordForbid' }],
  [SyntaxKind.KeywordEntropy, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'KeywordEntropy' }],
  [SyntaxKind.KeywordAlgorithm, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'KeywordAlgorithm' }],
  [SyntaxKind.KeywordRoot, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'KeywordRoot' }],
  [SyntaxKind.KeywordChannel, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'KeywordChannel' }],
  [SyntaxKind.KeywordStream, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'KeywordStream' }],
  [SyntaxKind.KeywordEffects, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'KeywordEffects' }],
  [SyntaxKind.KeywordFilesystem, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'KeywordFilesystem' }],
  [SyntaxKind.KeywordNetwork, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'KeywordNetwork' }],
  [SyntaxKind.KeywordProcess, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'KeywordProcess' }],
  [SyntaxKind.KeywordEnvironment, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'KeywordEnvironment' }],
  [SyntaxKind.KeywordClock, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'KeywordClock' }],
  [SyntaxKind.KeywordModelInference, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'KeywordModelInference' }],
  [SyntaxKind.KeywordBudget, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'KeywordBudget' }],
  [SyntaxKind.KeywordTarget, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'KeywordTarget' }],
  [SyntaxKind.KeywordEquivalence, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'KeywordEquivalence' }],
  [SyntaxKind.KeywordExtension, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'KeywordExtension' }],
  [SyntaxKind.KeywordSchema, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'KeywordSchema' }],
  [SyntaxKind.KeywordCapability, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'KeywordCapability' }],
  [SyntaxKind.KeywordLineage, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'KeywordLineage' }],
  [SyntaxKind.KeywordProvenance, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'KeywordProvenance' }],
  [SyntaxKind.KeywordValidation, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'KeywordValidation' }],
  [SyntaxKind.KeywordCompatibility, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'KeywordCompatibility' }],
  [SyntaxKind.KeywordNode, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'KeywordNode' }],
  [SyntaxKind.KeywordEdge, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'KeywordEdge' }],
  [SyntaxKind.KeywordTrue, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'BooleanLiteral' }],
  [SyntaxKind.KeywordFalse, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'BooleanLiteral' }],
  [SyntaxKind.KeywordNone, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'AbsenceLiteral' }],
  [SyntaxKind.KeywordDeny, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'KeywordDeny' }],
  [SyntaxKind.KeywordAllow, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'KeywordAllow' }],
  [SyntaxKind.KeywordReadOnly, { classification: SyntaxKindClassification.TOKEN, astEquivalent: 'KeywordReadOnly' }],
  [SyntaxKind.LeftBrace, { classification: SyntaxKindClassification.TOKEN }],
  [SyntaxKind.RightBrace, { classification: SyntaxKindClassification.TOKEN }],
  [SyntaxKind.LeftBracket, { classification: SyntaxKindClassification.TOKEN }],
  [SyntaxKind.RightBracket, { classification: SyntaxKindClassification.TOKEN }],
  [SyntaxKind.LeftParen, { classification: SyntaxKindClassification.TOKEN }],
  [SyntaxKind.RightParen, { classification: SyntaxKindClassification.TOKEN }],
  [SyntaxKind.Comma, { classification: SyntaxKindClassification.TOKEN }],
  [SyntaxKind.Colon, { classification: SyntaxKindClassification.TOKEN }],
  [SyntaxKind.DoubleColon, { classification: SyntaxKindClassification.TOKEN }],
  [SyntaxKind.Dot, { classification: SyntaxKindClassification.TOKEN }],
  [SyntaxKind.DotDot, { classification: SyntaxKindClassification.TOKEN }],
  [SyntaxKind.At, { classification: SyntaxKindClassification.TOKEN }],
  [SyntaxKind.Arrow, { classification: SyntaxKindClassification.TOKEN }],
  [SyntaxKind.Question, { classification: SyntaxKindClassification.TOKEN }],
  [SyntaxKind.Semicolon, { classification: SyntaxKindClassification.TOKEN }],
  [SyntaxKind.Assign, { classification: SyntaxKindClassification.TOKEN }],
  [SyntaxKind.Plus, { classification: SyntaxKindClassification.TOKEN }],
  [SyntaxKind.Minus, { classification: SyntaxKindClassification.TOKEN }],
  [SyntaxKind.Star, { classification: SyntaxKindClassification.TOKEN }],
  [SyntaxKind.Slash, { classification: SyntaxKindClassification.TOKEN }],
  [SyntaxKind.Percent, { classification: SyntaxKindClassification.TOKEN }],
  [SyntaxKind.Bang, { classification: SyntaxKindClassification.TOKEN }],
  [SyntaxKind.EqualEqual, { classification: SyntaxKindClassification.TOKEN }],
  [SyntaxKind.BangEqual, { classification: SyntaxKindClassification.TOKEN }],
  [SyntaxKind.Less, { classification: SyntaxKindClassification.TOKEN }],
  [SyntaxKind.LessEqual, { classification: SyntaxKindClassification.TOKEN }],
  [SyntaxKind.Greater, { classification: SyntaxKindClassification.TOKEN }],
  [SyntaxKind.GreaterEqual, { classification: SyntaxKindClassification.TOKEN }],
  [SyntaxKind.LogicalAnd, { classification: SyntaxKindClassification.TOKEN }],
  [SyntaxKind.LogicalOr, { classification: SyntaxKindClassification.TOKEN }],
  [SyntaxKind.Range, { classification: SyntaxKindClassification.TOKEN }],
  [SyntaxKind.In, { classification: SyntaxKindClassification.TOKEN }],
  [SyntaxKind.WhitespaceTrivia, { classification: SyntaxKindClassification.TRIVIA }],
  [SyntaxKind.NewlineTrivia, { classification: SyntaxKindClassification.TRIVIA }],
  [SyntaxKind.LineCommentTrivia, { classification: SyntaxKindClassification.TRIVIA }],
  [SyntaxKind.BlockCommentTrivia, { classification: SyntaxKindClassification.TRIVIA }],
  [SyntaxKind.DocumentationCommentTrivia, { classification: SyntaxKindClassification.TRIVIA }],
  [SyntaxKind.ByteOrderMarkTrivia, { classification: SyntaxKindClassification.TRIVIA }],
  [SyntaxKind.CompilationUnit, { classification: SyntaxKindClassification.CST_NODE, astEquivalent: 'CompilationUnit' }],
  [SyntaxKind.ModuleDeclaration, { classification: SyntaxKindClassification.CST_NODE, astEquivalent: 'ModuleDeclaration' }],
  [SyntaxKind.ImportDeclaration, { classification: SyntaxKindClassification.CST_NODE, astEquivalent: 'ImportDeclaration' }],
  [SyntaxKind.ExportDeclaration, { classification: SyntaxKindClassification.CST_NODE, astEquivalent: 'ExportDeclaration' }],
  [SyntaxKind.SeedDeclaration, { classification: SyntaxKindClassification.CST_NODE, astEquivalent: 'SeedDeclaration' }],
  [SyntaxKind.DomainDeclaration, { classification: SyntaxKindClassification.CST_NODE, astEquivalent: 'DomainDeclaration' }],
  [SyntaxKind.IntentDeclaration, { classification: SyntaxKindClassification.CST_NODE, astEquivalent: 'IntentDeclaration' }],
  [SyntaxKind.GeneDeclaration, { classification: SyntaxKindClassification.CST_NODE, astEquivalent: 'GeneDeclaration' }],
  [SyntaxKind.ConstraintBlock, { classification: SyntaxKindClassification.CST_NODE, astEquivalent: 'ConstraintBlock' }],
  [SyntaxKind.EntropyBlock, { classification: SyntaxKindClassification.CST_NODE, astEquivalent: 'EntropyBlock' }],
  [SyntaxKind.EffectsBlock, { classification: SyntaxKindClassification.CST_NODE, astEquivalent: 'EffectsBlock' }],
  [SyntaxKind.BudgetBlock, { classification: SyntaxKindClassification.CST_NODE, astEquivalent: 'BudgetBlock' }],
  [SyntaxKind.TargetDeclaration, { classification: SyntaxKindClassification.CST_NODE, astEquivalent: 'TargetDeclaration' }],
  [SyntaxKind.ExtensionDeclaration, { classification: SyntaxKindClassification.CST_NODE, astEquivalent: 'ExtensionDeclaration' }],
  [SyntaxKind.TypeExpression, { classification: SyntaxKindClassification.CST_NODE, astEquivalent: 'TypeExpression' }],
  [SyntaxKind.Expression, { classification: SyntaxKindClassification.CST_NODE, astEquivalent: 'Expression' }],
  [SyntaxKind.Block, { classification: SyntaxKindClassification.CST_NODE }],
]);

export function classify(kind: SyntaxKind): SyntaxKindClassification {
  const e = SYNTAX_KIND_CLASSIFICATION.get(kind);
  if (e !== undefined) return e.classification;
  return SyntaxKindClassification.PARSER_ONLY;
}

export function isTokenKind(kind: SyntaxKind): boolean { return classify(kind) === SyntaxKindClassification.TOKEN; }
export function isTriviaKind(kind: SyntaxKind): boolean { return classify(kind) === SyntaxKindClassification.TRIVIA; }
export function isRecoveryKind(kind: SyntaxKind): boolean { return classify(kind) === SyntaxKindClassification.RECOVERY; }
export function isCstNodeKind(kind: SyntaxKind): boolean { return classify(kind) === SyntaxKindClassification.CST_NODE; }
export function isAstLowerableKind(kind: SyntaxKind): boolean { return classify(kind) === SyntaxKindClassification.AST_LOWERABLE; }
export function isParserOnlyKind(kind: SyntaxKind): boolean { return classify(kind) === SyntaxKindClassification.PARSER_ONLY; }
