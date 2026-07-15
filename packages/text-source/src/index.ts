/**
 * @gspl/text-source — foundational source identity, positions, spans, diagnostics,
 * source loading, and Unicode security. Prompt 3 §6, §7, §15, §18, §28.
 */
export type { SourceId, SourcePosition, SourceSpan, Trivia, TriviaKind, Diagnostic, DiagnosticSeverity, DiagnosticRelated } from './types.js';
export { makeDiagnostic } from './types.js';
export { SourceDocument, computeSourceId } from './source-document.js';
export type { ISourceLoader } from './source-loader.js';
export { InMemorySourceLoader, FilesystemSourceLoader } from './source-loader.js';
export type { UnicodeSecurityFinding, UnicodeCheckResult } from './unicode-security.js';
export { checkForbiddenControls, normalizeIdentifier, isNfcNormalized, looksLikeConfusable, checkConfusables } from './unicode-security.js';
