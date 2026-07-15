/**
 * Central logical-path normalization. Prompt 3 §3.
 * - Uses '/' as logical separator
 * - Collapses redundant separators
 * - Rejects '.' and '..' segments
 * - Rejects absolute, drive-letter, UNC, NUL, forbidden control chars
 * - Applies NFC + case policy
 */
import { makeDiagnostic } from './diagnostic-types.js';
import type {
  LogicalPathPolicy,
  LogicalPathResult,
  SourceSpan,
} from './types.js';
import { DEFAULT_LOGICAL_PATH_POLICY } from './types.js';
import type { Diagnostic } from './diagnostic-types.js';
import type { SourceId } from './types.js';

const DUMMY_SPAN: SourceSpan = {
  sourceId: '' as SourceId,
  start: 0,
  end: 0,
};

function diag(code: string, message: string, span: SourceSpan = DUMMY_SPAN): Diagnostic {
  return makeDiagnostic({
    code,
    message,
    severity: 'error',
    span,
    category: 'source',
    phase: 'path-normalize',
    canonical: true,
  });
}

function isForbiddenControl(ch: string): boolean {
  if (ch.length !== 1) return false;
  const cp = ch.charCodeAt(0);
  if (cp === 0x09 || cp === 0x0a || cp === 0x0d) return false; // tab, LF, CR
  return cp < 0x20 || cp === 0x7f;
}

export function normalizeLogicalSourcePath(
  input: string,
  policy: LogicalPathPolicy = DEFAULT_LOGICAL_PATH_POLICY,
): LogicalPathResult {
  const diagnostics: Diagnostic[] = [];
  if (typeof input !== 'string') {
    return { ok: false, diagnostics: [diag('GSPL-SOURCE-PATH-INVALID', 'logical path must be a string')] };
  }
  if (input.length === 0) {
    return { ok: false, diagnostics: [diag('GSPL-SOURCE-PATH-EMPTY', 'logical path must be non-empty')] };
  }
  // Reject NUL.
  if (input.indexOf('\0') >= 0) {
    return { ok: false, diagnostics: [diag('GSPL-SOURCE-PATH-NUL', 'logical path must not contain NUL')] };
  }
  // Reject forbidden controls.
  for (let i = 0; i < input.length; i++) {
    if (isForbiddenControl(input[i]!)) {
      return {
        ok: false,
        diagnostics: [diag('GSPL-SOURCE-PATH-FORBIDDEN-CONTROL', 'logical path contains forbidden control character')],
      };
    }
  }
  // Reject absolute / UNC / drive-letter.
  if (input.startsWith('//') || input.startsWith('\\')) {
    return { ok: false, diagnostics: [diag('GSPL-SOURCE-PATH-UNC', 'UNC paths are not allowed')] };
  }
  if (input.startsWith('/') || input.startsWith('\\')) {
    return { ok: false, diagnostics: [diag('GSPL-SOURCE-PATH-ABSOLUTE', 'absolute paths are not allowed')] };
  }
  if (/^[A-Za-z]:[\\/]/.test(input)) {
    return { ok: false, diagnostics: [diag('GSPL-SOURCE-PATH-DRIVE', 'drive-letter paths are not allowed')] };
  }
  // Split, validate, collapse.
  const rawSegments = input.split(/[\\/]+/);
  const segments: string[] = [];
  for (const seg of rawSegments) {
    if (seg === '' && policy.rejectEmptySegments && segments.length > 0) {
      return { ok: false, diagnostics: [diag('GSPL-SOURCE-PATH-EMPTY-SEGMENT', 'empty interior segment')] };
    }
    if (seg === '.') continue;
    if (seg === '..') {
      return { ok: false, diagnostics: [diag('GSPL-SOURCE-PATH-TRAVERSAL', "path traversal '..' is forbidden")] };
    }
    if (seg !== '') segments.push(seg);
  }
  if (segments.length === 0) {
    return { ok: false, diagnostics: [diag('GSPL-SOURCE-PATH-EMPTY', 'logical path must contain at least one segment')] };
  }
  // Apply case policy.
  const cased = segments.map((s) => {
    if (policy.casePolicy === 'lowercase') return s.toLowerCase();
    if (policy.casePolicy === 'uppercase') return s.toUpperCase();
    return s;
  });
  // Apply NFC.
  const normalized = policy.nfcNormalize
    ? cased.map((s) => s.normalize('NFC'))
    : cased;
  const out = normalized.join('/');
  return { ok: true, normalized: out, diagnostics };
}
