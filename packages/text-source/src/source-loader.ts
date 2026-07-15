/**
 * SourceLoader — explicit source loading interface.
 * Byte-level reading (Prompt 3 §4), strict UTF-8, structured SourceLoadResult.
 */
import { readFileSync, statSync, realpathSync, existsSync } from 'node:fs';
import { resolve as resolvePath, isAbsolute, sep } from 'node:path';
import { SourceDocument } from './source-document.js';
import { decodeStrictUtf8 } from './utf8.js';
import { normalizeLogicalSourcePath } from './logical-path.js';
import { makeDiagnostic } from './diagnostic-types.js';
import type {
  ISourceLoader,
  SourceRequest,
  SourceLoadResult,
  SourceDocumentData,
  LogicalPathPolicy,
  CasePolicy,
  SymlinkPolicy,
} from './types.js';
import { DEFAULT_ENCODING_POLICY, DEFAULT_SOURCE_LIMITS, DEFAULT_LOGICAL_PATH_POLICY } from './types.js';
import type { SourceId } from './types.js';
import type { Diagnostic } from './diagnostic-types.js';

export type { SourceRequest, SourceLoadResult, SourceDocumentData } from './types.js';

const DUMMY_ID = '' as SourceId;

function byteDiagnostic(code: string, message: string, byteOffset: number): Diagnostic {
  return makeDiagnostic({
    code,
    message,
    severity: 'error',
    span: { sourceId: DUMMY_ID, start: byteOffset, end: byteOffset },
    category: 'source',
    phase: 'load',
    canonical: true,
  });
}

function makeDecoder() {
  return new TextEncoder();
}

/** In-memory source loader for tests and tooling. */
export class InMemorySourceLoader {
  private readonly files = new Map<string, SourceDocument>();

  provide(logicalPath: string, text: string, hadBom = false): SourceDocument {
    const rawBytes = new TextEncoder().encode(text);
    const doc = SourceDocument.fromParts({ logicalPath, rawBytes, text, hadBom });
    this.files.set(logicalPath, doc);
    return doc;
  }

  has(logicalPath: string): boolean {
    return this.files.has(logicalPath);
  }

  async load(req: SourceRequest): Promise<SourceLoadResult> {
    return this.loadSync(req);
  }

  loadSync(req: SourceRequest): SourceLoadResult {
    const pathResult = normalizeLogicalSourcePath(req.logicalPath, DEFAULT_LOGICAL_PATH_POLICY);
    if (!pathResult.ok) return { ok: false, diagnostics: pathResult.diagnostics };
    const doc = this.files.get(pathResult.normalized!);
    if (!doc) {
      return {
        ok: false,
        diagnostics: [
          makeDiagnostic({
            code: 'GSPL-SOURCE-NOT-FOUND',
            message: 'source not found in in-memory loader: ' + pathResult.normalized,
            severity: 'error',
            span: { sourceId: DUMMY_ID, start: 0, end: 0 },
            category: 'source',
            phase: 'load',
            canonical: true,
          }),
        ],
      };
    }
    return { ok: true, document: doc.toData(), diagnostics: [] };
  }
}

/**
 * Filesystem source loader with full containment + symlink policy.
 * Reads bytes first, then strict-decodes UTF-8, then constructs SourceDocument.
 */
export class FilesystemSourceLoader {
  constructor(private readonly rootDir: string) {
    if (!isAbsolute(rootDir)) {
      throw new Error('FilesystemSourceLoader root must be absolute');
    }
    this.rootDir = resolvePath(rootDir);
  }

  private resolveSafe(
    logicalPath: string,
    policy: LogicalPathPolicy,
    symlinkPolicy: SymlinkPolicy,
  ): { ok: true; abs: string } | { ok: false; diagnostics: readonly Diagnostic[] } {
    const pathResult = normalizeLogicalSourcePath(logicalPath, policy);
    if (!pathResult.ok) return { ok: false, diagnostics: pathResult.diagnostics };
    const abs = resolvePath(this.rootDir, pathResult.normalized!);
    // Containment check.
    if (abs !== this.rootDir && !abs.startsWith(this.rootDir + sep) && !abs.startsWith(this.rootDir + '/')) {
      return {
        ok: false,
        diagnostics: [
          makeDiagnostic({
            code: 'GSPL-SOURCE-PATH-ESCAPE',
            message: 'path escapes the allowed root',
            severity: 'error',
            span: { sourceId: DUMMY_ID, start: 0, end: 0 },
            category: 'source',
            phase: 'load',
            canonical: true,
          }),
        ],
      };
    }
    // Symlink check.
    if (existsSync(abs)) {
      try {
        const real = realpathSync(abs);
        if (!real.startsWith(this.rootDir + sep) && real !== this.rootDir) {
          return {
            ok: false,
            diagnostics: [
              makeDiagnostic({
                code: 'GSPL-SOURCE-SYMLINK-ESCAPE',
                message: 'symlink target is outside the allowed root',
                severity: 'error',
                span: { sourceId: DUMMY_ID, start: 0, end: 0 },
                category: 'source',
                phase: 'load',
                canonical: true,
              }),
            ],
          };
        }
      } catch {
        // realpathSync may fail on broken symlinks; treat as escape.
        if (symlinkPolicy === 'forbid') {
          return {
            ok: false,
            diagnostics: [
              makeDiagnostic({
                code: 'GSPL-SOURCE-SYMLINK-ESCAPE',
                message: 'broken symlink is forbidden',
                severity: 'error',
                span: { sourceId: DUMMY_ID, start: 0, end: 0 },
                category: 'source',
                phase: 'load',
                canonical: true,
              }),
            ],
          };
        }
      }
    }
    return { ok: true, abs };
  }

  async load(req: SourceRequest): Promise<SourceLoadResult> {
    return this.loadSync(req);
  }

  loadSync(req: SourceRequest): SourceLoadResult {
    const safe = this.resolveSafe(req.logicalPath, DEFAULT_LOGICAL_PATH_POLICY, req.symlinkPolicy);
    if (!safe.ok) return { ok: false, diagnostics: safe.diagnostics };
    if (!existsSync(safe.abs)) {
      return {
        ok: false,
        diagnostics: [
          makeDiagnostic({
            code: 'GSPL-SOURCE-NOT-FOUND',
            message: 'source file not found: ' + req.logicalPath,
            severity: 'error',
            span: { sourceId: DUMMY_ID, start: 0, end: 0 },
            category: 'source',
            phase: 'load',
            canonical: true,
          }),
        ],
      };
    }
    let stat;
    try {
      stat = statSync(safe.abs);
    } catch (e) {
      return {
        ok: false,
        diagnostics: [
          makeDiagnostic({
            code: 'GSPL-SOURCE-IO-ERROR',
            message: 'failed to stat: ' + String((e as Error).message ?? e),
            severity: 'error',
            span: { sourceId: DUMMY_ID, start: 0, end: 0 },
            category: 'source',
            phase: 'load',
            canonical: true,
          }),
        ],
      };
    }
    if (!stat.isFile()) {
      return {
        ok: false,
        diagnostics: [
          makeDiagnostic({
            code: 'GSPL-SOURCE-NOT-REGULAR-FILE',
            message: 'source path is not a regular file',
            severity: 'error',
            span: { sourceId: DUMMY_ID, start: 0, end: 0 },
            category: 'source',
            phase: 'load',
            canonical: true,
          }),
        ],
      };
    }
    if (stat.size > req.limits.maxSourceBytes) {
      return {
        ok: false,
        diagnostics: [
          makeDiagnostic({
            code: 'GSPL-SOURCE-FILE-TOO-LARGE',
            message: 'source file exceeds maxSourceBytes: ' + stat.size,
            severity: 'error',
            span: { sourceId: DUMMY_ID, start: 0, end: 0 },
            category: 'source',
            phase: 'load',
            canonical: true,
          }),
        ],
      };
    }
    let bytes: Uint8Array;
    try {
      bytes = new Uint8Array(readFileSync(safe.abs));
    } catch (e) {
      return {
        ok: false,
        diagnostics: [
          makeDiagnostic({
            code: 'GSPL-SOURCE-IO-ERROR',
            message: 'failed to read: ' + String((e as Error).message ?? e),
            severity: 'error',
            span: { sourceId: DUMMY_ID, start: 0, end: 0 },
            category: 'source',
            phase: 'load',
            canonical: true,
          }),
        ],
      };
    }
    const decoded = decodeStrictUtf8(bytes);
    if (!decoded.ok) {
      return {
        ok: false,
        diagnostics: [
          makeDiagnostic({
            code: 'GSPL-SOURCE-INVALID-UTF8',
            message: 'invalid UTF-8 at byte offset ' + decoded.byteOffset + ': ' + decoded.reason,
            severity: 'error',
            span: { sourceId: DUMMY_ID, start: decoded.byteOffset, end: decoded.byteOffset },
            category: 'source',
            phase: 'decode',
            related: [
              {
                message: 'context: ' + decoded.context,
                span: { sourceId: DUMMY_ID, start: 0, end: 0 },
              },
            ],
            canonical: true,
          }),
        ],
      };
    }
    if (decoded.text.length > req.limits.maxDecodedCodeUnits) {
      return {
        ok: false,
        diagnostics: [
          makeDiagnostic({
            code: 'GSPL-SOURCE-FILE-TOO-LARGE',
            message: 'decoded source exceeds maxDecodedCodeUnits: ' + decoded.text.length,
            severity: 'error',
            span: { sourceId: DUMMY_ID, start: 0, end: 0 },
            category: 'source',
            phase: 'load',
            canonical: true,
          }),
        ],
      };
    }
    const doc = SourceDocument.fromParts({
      logicalPath: req.logicalPath,
      rawBytes: bytes,
      text: decoded.text,
      hadBom: decoded.hadBom,
      encoding: req.encoding,
    });
    return { ok: true, document: doc.toData(), diagnostics: [] };
  }
}
