/**
 * @gspl/syntax-tree -- immutable green/red CST primitives.
 * Prompt 3 §8 (lossless CST), §22 (syntax kinds).
 */
export { SyntaxKind, KEYWORD_KINDS, PUNCTUATION_KINDS, OPERATOR_KINDS, isKeyword, isTrivia } from './syntax-kind.js';
export { GreenToken, stableHashFor, type GreenTokenData } from './green-token.js';
export { GreenTrivia, type GreenTriviaData } from './trivia.js';
export {
  SyntaxKindClassification,
  SYNTAX_KIND_CLASSIFICATION,
  classify,
  isTokenKind,
  isTriviaKind,
  isRecoveryKind,
  isCstNodeKind,
  isAstLowerableKind,
  isParserOnlyKind,
  type ClassificationEntry,
} from './syntax-kind-class.js';
export {
  GreenNode,
  GreenNodeBuilder,
  SyntaxFlags,
  isGreenNode,
  isGreenToken,
  type GreenChild,
  type GreenNodeData,
} from './green-node.js';
export {
  RedNode,
  RedToken,
  type RedChild,
  type SyntaxTree,
  createSyntaxTree,
  isRedNode,
  isRedToken,
  type RedNodeData,
  type RedTokenData,
  type TriviaMap,
  type TriviaEntry,
} from './red-node.js';
export {
  printCST,
  printRedNode,
  printRedChild,
  printRedToken,
  printTrivia,
} from './print-cst.js';
export {
  SyntaxNode,
  CompilationUnitSyntax,
  SeedDeclarationSyntax,
  GeneDeclarationSyntax,
  ImportDeclarationSyntax,
  ExportDeclarationSyntax,
  ExpressionSyntax,
  TypeExpressionSyntax,
  getCompilationUnit,
} from './typed-accessors.js';
