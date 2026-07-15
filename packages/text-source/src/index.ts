/**
 * @gspl/text-source — foundational source identity, positions, spans, diagnostics,
 * source loading, and Unicode security. Prompt 3 §2, §6, §7, §8, §10, §11, §15, §18, §28.
 */
export type {
  SourceId,
  SourceSnapshotId,
  SourceContentHash,
  RawByteHash,
  SourcePosition,
  SourceSpan,
  Trivia,
  TriviaKind,
  DiagnosticSeverity,
  DiagnosticRelated,
  UnicodeSecurityCode,
  UnicodeSecurityFinding,
  UnicodeCheckResult,
  IdentifierIdentity,
  LogicalPathPolicy,
  LogicalPathResult,
  EncodingPolicy,
  SymlinkPolicy,
  CasePolicy,
  SourceLimits,
  SourceRequest,
  SourceLoadResult,
  SourceDocumentData,
} from './types.js';
export {
  DEFAULT_LOGICAL_PATH_POLICY,
  DEFAULT_ENCODING_POLICY,
  DEFAULT_SOURCE_LIMITS,
} from './types.js';

export type { Diagnostic } from './diagnostic-types.js';
export { makeDiagnostic } from './diagnostic-types.js';

export {
  SourceDocument,
  computeSourceId,
  computeSourceSnapshotId,
  computeRawByteHash,
  computeContentHash,
  buildLineStarts,
} from './source-document.js';

export type { Utf8DecodeResult, Utf8DecodeSuccess, Utf8DecodeFailure } from './utf8.js';
export { decodeStrictUtf8 } from './utf8.js';

export { normalizeLogicalSourcePath } from './logical-path.js';
export type { ISourceLoader } from './types.js';
export { InMemorySourceLoader, FilesystemSourceLoader } from './source-loader.js';

export {
  UNICODE_PROFILE,
  checkForbiddenControls,
  checkConfusables,
  normalizeIdentifier,
  isNfcNormalized,
  confusableSkeleton,
  analyzeIdentifier,
  isIdentifierStartChar,
  isIdentifierContinueChar,
  looksLikeConfusable,
} from './unicode-security.js';
