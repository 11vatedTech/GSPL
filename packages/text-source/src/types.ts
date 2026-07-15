/**
 * text-source types — foundational source identity, positions, spans, diagnostics,
 * source loading, and Unicode security. Prompt 3 §2, §6, §7, §8, §10, §11, §15, §18, §28.
 */
export type SourceId = string & { readonly __brand: 'SourceId' };
export type SourceSnapshotId = string & { readonly __brand: 'SourceSnapshotId' };
export type SourceContentHash = string & { readonly __brand: 'SourceContentHash' };
export type RawByteHash = string & { readonly __brand: 'RawByteHash' };

export interface SourcePosition {
  /** 0-indexed offset into the source text, measured in UTF-16 code units. */
  readonly offset: number;
  /** 1-indexed line number. */
  readonly line: number;
  /** 1-indexed column number, measured in UTF-16 code units. */
  readonly column: number;
}

export interface SourceSpan {
  readonly sourceId: SourceId;
  /** Inclusive start offset in UTF-16 code units. */
  readonly start: number;
  /** Exclusive end offset in UTF-16 code units. */
  readonly end: number;
}

export type TriviaKind =
  | 'whitespace'
  | 'line-comment'
  | 'block-comment'
  | 'documentation-comment'
  | 'newline'
  | 'byte-order-mark';

export interface Trivia {
  readonly kind: TriviaKind;
  readonly text: string;
  readonly span: SourceSpan;
}

export type DiagnosticSeverity = 'error' | 'warning' | 'info';

export interface DiagnosticRelated {
  readonly message: string;
  readonly span: SourceSpan;
}

export type UnicodeSecurityCode =
  | 'GSPL-SOURCE-INVALID-UTF8'
  | 'GSPL-SOURCE-FORBIDDEN-CONTROL'
  | 'GSPL-SOURCE-BIDI-CONTROL'
  | 'GSPL-SOURCE-ZERO-WIDTH'
  | 'GSPL-SOURCE-NONNORMALIZED-IDENTIFIER'
  | 'GSPL-SOURCE-MIXED-SCRIPT-IDENTIFIER'
  | 'GSPL-SOURCE-CONFUSABLE-IDENTIFIER'
  | 'GSPL-SOURCE-UNPAIRED-SURROGATE'
  | 'GSPL-SOURCE-DEFAULT-IGNORABLE'
  | 'GSPL-SOURCE-AMBIGUOUS-WHITESPACE'
  | 'GSPL-SOURCE-LEADING-COMBINING-MARK';

export interface UnicodeSecurityFinding {
  readonly code: UnicodeSecurityCode;
  readonly offset: number;
  readonly character?: string;
  readonly message?: string;
}

export interface UnicodeCheckResult {
  readonly findings: readonly UnicodeSecurityFinding[];
  readonly ok: boolean;
}

export interface IdentifierIdentity {
  /** Original spelling as written in the source. */
  readonly original: string;
  /** NFC-normalized identity. */
  readonly normalized: string;
  /** Confusable skeleton (lowercase, confusables mapped). */
  readonly confusableSkeleton: string;
  /** Distinct script codes that appear in the identifier. */
  readonly scripts: readonly string[];
  readonly findings: readonly UnicodeSecurityFinding[];
}

export interface LogicalPathPolicy {
  readonly nfcNormalize: boolean;
  readonly casePolicy: 'preserve' | 'lowercase' | 'uppercase';
  readonly caseCollisionCheck: boolean;
  readonly rejectEmptySegments: boolean;
}

export const DEFAULT_LOGICAL_PATH_POLICY: LogicalPathPolicy = {
  nfcNormalize: true,
  casePolicy: 'preserve',
  caseCollisionCheck: false,
  rejectEmptySegments: true,
};

export interface LogicalPathResult {
  readonly ok: boolean;
  readonly normalized?: string;
  readonly diagnostics: readonly import('./diagnostic-types.js').Diagnostic[];
}

export interface EncodingPolicy {
  readonly encoding: 'utf-8';
  readonly allowBom: boolean;
  readonly policyVersion: string;
}

export const DEFAULT_ENCODING_POLICY: EncodingPolicy = {
  encoding: 'utf-8',
  allowBom: true,
  policyVersion: '1.0',
};

export type SymlinkPolicy = 'forbid' | 'allow-contained' | 'allow';

export interface CasePolicy {
  readonly detectCollisions: boolean;
  readonly portability: 'sensitive' | 'portable';
}

export interface SourceLimits {
  readonly maxSourceBytes: number;
  readonly maxDecodedCodeUnits: number;
  readonly maxLines: number;
  readonly maxLineLength: number;
  readonly maxIdentifierCodeUnits: number;
  readonly maxStringCodeUnits: number;
  readonly maxCommentCodeUnits: number;
  readonly maxTriviaCodeUnits: number;
  readonly maxTokenCount: number;
  readonly maxDiagnostics: number;
}

export const DEFAULT_SOURCE_LIMITS: SourceLimits = {
  maxSourceBytes: 16 * 1024 * 1024,
  maxDecodedCodeUnits: 8 * 1024 * 1024,
  maxLines: 100_000,
  maxLineLength: 10_000,
  maxIdentifierCodeUnits: 1024,
  maxStringCodeUnits: 1 * 1024 * 1024,
  maxCommentCodeUnits: 64 * 1024,
  maxTriviaCodeUnits: 1 * 1024 * 1024,
  maxTokenCount: 1_000_000,
  maxDiagnostics: 10_000,
};

export interface SourceRequest {
  readonly logicalPath: string;
  readonly allowedRoot?: string;
  readonly limits: SourceLimits;
  readonly encoding: EncodingPolicy;
  readonly symlinkPolicy: SymlinkPolicy;
  readonly casePolicy: CasePolicy;
  readonly requestingSourceId?: SourceId;
}

export interface SourceLoadResult {
  readonly ok: boolean;
  readonly document?: SourceDocumentData;
  readonly diagnostics: readonly import('./diagnostic-types.js').Diagnostic[];
}

export interface ISourceLoader {
  load(req: SourceRequest): Promise<SourceLoadResult>;
  loadSync(req: SourceRequest): SourceLoadResult;
}

export interface SourceDocumentData {
  readonly id: SourceId;
  readonly snapshotId: SourceSnapshotId;
  readonly logicalPath: string;
  readonly rawByteHash: RawByteHash;
  readonly contentHash: SourceContentHash;
  readonly encoding: 'utf-8';
  readonly hadBom: boolean;
  readonly byteLength: number;
  readonly textLength: number;
  readonly text: string;
  readonly lineStarts: readonly number[];
}
