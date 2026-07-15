import { describe, it, expect } from 'vitest';
import {
  SourceDocument,
  computeSourceId,
  computeSourceSnapshotId,
  computeContentHash,
  buildLineStarts,
} from '../src/source-document.js';
import {
  checkForbiddenControls,
  checkConfusables,
  normalizeIdentifier,
  isNfcNormalized,
  analyzeIdentifier,
  isIdentifierStartChar,
  isIdentifierContinueChar,
  looksLikeConfusable,
  confusableSkeleton,
} from '../src/unicode-security.js';
import { InMemorySourceLoader, FilesystemSourceLoader } from '../src/source-loader.js';
import { normalizeLogicalSourcePath } from '../src/logical-path.js';
import { decodeStrictUtf8 } from '../src/utf8.js';
import {
  DEFAULT_ENCODING_POLICY,
  DEFAULT_SOURCE_LIMITS,
  makeDiagnostic,
} from '../src/index.js';
import type { SourceRequest } from '../src/types.js';

function defaultRequest(logicalPath: string): SourceRequest {
  return {
    logicalPath,
    limits: DEFAULT_SOURCE_LIMITS,
    encoding: DEFAULT_ENCODING_POLICY,
    symlinkPolicy: 'forbid',
    casePolicy: { detectCollisions: false, portability: 'sensitive' },
  };
}

describe('SourceDocument — three identities', () => {
  it('SourceId is independent of content', () => {
    const a = SourceDocument.create('a/b.gspl', 'hello');
    const b = SourceDocument.create('a/b.gspl', 'world');
    expect(a.id).toBe(b.id);
  });

  it('SourceSnapshotId changes when text changes', () => {
    const a = SourceDocument.create('a/b.gspl', 'hello');
    const b = SourceDocument.create('a/b.gspl', 'world');
    expect(a.snapshotId).not.toBe(b.snapshotId);
  });

  it('different logical paths produce different SourceIds', () => {
    const a = SourceDocument.create('a.gspl', 'same');
    const b = SourceDocument.create('b.gspl', 'same');
    expect(a.id).not.toBe(b.id);
  });

  it('identical text produces identical contentHash', () => {
    const a = computeContentHash('hello');
    const b = computeContentHash('hello');
    expect(a).toBe(b);
  });

  it('sourceId computation is stable', () => {
    expect(computeSourceId('a/b.gspl')).toBe(computeSourceId('a/b.gspl'));
  });

  it('snapshotId is deterministic from inputs', () => {
    const id = computeSourceId('x');
    const raw = 'rawhashplaceholder' as unknown as Parameters<typeof computeSourceSnapshotId>[0]['rawByteHash'];
    const h = computeContentHash('y');
    const s1 = computeSourceSnapshotId({ sourceId: id, rawByteHash: raw, contentHash: h, encoding: DEFAULT_ENCODING_POLICY });
    const s2 = computeSourceSnapshotId({ sourceId: id, rawByteHash: raw, contentHash: h, encoding: DEFAULT_ENCODING_POLICY });
    expect(s1).toBe(s2);
  });
});

describe('SourceDocument — line index + positionAt', () => {
  it('positionAt on single-line text', () => {
    const doc = SourceDocument.create('a.gspl', 'hello');
    expect(doc.positionAt(0)).toEqual({ offset: 0, line: 1, column: 1 });
    expect(doc.positionAt(4)).toEqual({ offset: 4, line: 1, column: 5 });
  });

  it('positionAt on multi-line text', () => {
    const doc = SourceDocument.create('a.gspl', 'a\nb\nc');
    expect(doc.positionAt(0)).toEqual({ offset: 0, line: 1, column: 1 });
    expect(doc.positionAt(2)).toEqual({ offset: 2, line: 2, column: 1 });
    expect(doc.positionAt(4)).toEqual({ offset: 4, line: 3, column: 1 });
  });

  it('positionAt clamps out-of-range', () => {
    const doc = SourceDocument.create('a.gspl', 'hi');
    expect(doc.positionAt(-1).offset).toBe(0);
    expect(doc.positionAt(100).offset).toBe(2);
  });

  it('offsetAt reverse lookup', () => {
    const doc = SourceDocument.create('a.gspl', 'a\nb\nc');
    expect(doc.offsetAt(1, 1)).toBe(0);
    expect(doc.offsetAt(2, 1)).toBe(2);
    expect(doc.offsetAt(3, 1)).toBe(4);
  });

  it('buildLineStarts counts CRLF as one break', () => {
    const starts = buildLineStarts('a\r\nb');
    expect(starts.length).toBe(2);
  });

  it('buildLineStarts counts bare CR as one break', () => {
    const starts = buildLineStarts('a\rb');
    expect(starts.length).toBe(2);
  });

  it('lineText returns the text of a 1-indexed line', () => {
    const doc = SourceDocument.create('a.gspl', 'a\nb');
    expect(doc.lineText(1)).toBe('a');
    expect(doc.lineText(2)).toBe('b');
  });
});

describe('UTF-8 decoder', () => {
  it('decodes plain ASCII', () => {
    const r = decodeStrictUtf8(new TextEncoder().encode('hello'));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.text).toBe('hello');
      expect(r.hadBom).toBe(false);
    }
  });

  it('strips BOM', () => {
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, 0x68, 0x69]);
    const r = decodeStrictUtf8(bytes);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.text).toBe('hi');
      expect(r.hadBom).toBe(true);
    }
  });

  it('rejects truncated multi-byte', () => {
    const r = decodeStrictUtf8(new Uint8Array([0xc2]));
    expect(r.ok).toBe(false);
  });

  it('rejects overlong encoding', () => {
    const r = decodeStrictUtf8(new Uint8Array([0xc0, 0x80]));
    expect(r.ok).toBe(false);
  });

  it('rejects bare continuation', () => {
    const r = decodeStrictUtf8(new Uint8Array([0x80]));
    expect(r.ok).toBe(false);
  });

  it('rejects UTF-16 surrogate encoded in UTF-8', () => {
    const r = decodeStrictUtf8(new Uint8Array([0xed, 0xa0, 0x80]));
    expect(r.ok).toBe(false);
  });

  it('decodes 4-byte sequences (emoji)', () => {
    const r = decodeStrictUtf8(new Uint8Array([0xf0, 0x9f, 0x98, 0x80]));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.text).toBe('😀');
  });
});

describe('Logical path normalization', () => {
  it('normalizes separators to /', () => {
    const r = normalizeLogicalSourcePath('a\\b\\c');
    expect(r.ok).toBe(true);
    expect(r.normalized).toBe('a/b/c');
  });

  it('rejects ..', () => {
    const r = normalizeLogicalSourcePath('a/../b');
    expect(r.ok).toBe(false);
  });

  it('rejects . segments', () => {
    const r = normalizeLogicalSourcePath('a/./b');
    expect(r.ok).toBe(true);
    expect(r.normalized).toBe('a/b');
  });

  it('rejects absolute paths', () => {
    expect(normalizeLogicalSourcePath('/etc/passwd').ok).toBe(false);
    expect(normalizeLogicalSourcePath('\\server\\share').ok).toBe(false);
  });

  it('rejects drive-letter paths', () => {
    expect(normalizeLogicalSourcePath('C:/Windows').ok).toBe(false);
  });

  it('rejects empty path', () => {
    expect(normalizeLogicalSourcePath('').ok).toBe(false);
  });

  it('rejects NUL', () => {
    expect(normalizeLogicalSourcePath('a\0b').ok).toBe(false);
  });

  it('applies lowercase case policy', () => {
    const r = normalizeLogicalSourcePath('Foo/Bar', { nfcNormalize: true, casePolicy: 'lowercase', caseCollisionCheck: false, rejectEmptySegments: true });
    expect(r.normalized).toBe('foo/bar');
  });
});

describe('Unicode security', () => {
  it('checkForbiddenControls flags zero-width space', () => {
    const r = checkForbiddenControls('a\u200Bb');
    expect(r.ok).toBe(false);
  });

  it('checkForbiddenControls flags bidi control', () => {
    const r = checkForbiddenControls('a\u202Eb');
    expect(r.ok).toBe(false);
  });

  it('checkForbiddenControls flags unpaired surrogate', () => {
    const r = checkForbiddenControls('a\uD800b');
    expect(r.ok).toBe(false);
  });

  it('checkForbiddenControls flags default-ignorable', () => {
    const r = checkForbiddenControls('a\u00ADb');
    expect(r.ok).toBe(false);
  });

  it('checkForbiddenControls accepts plain ASCII', () => {
    expect(checkForbiddenControls('hello world').ok).toBe(true);
  });

  it('normalizeIdentifier normalizes to NFC', () => {
    const composed = '\u00e9';
    const decomposed = 'e\u0301';
    expect(normalizeIdentifier(decomposed)).toBe(composed);
  });

  it('isNfcNormalized returns true for NFC strings', () => {
    expect(isNfcNormalized('hello')).toBe(true);
  });

  it('isNfcNormalized returns false for decomposed', () => {
    expect(isNfcNormalized('e\u0301')).toBe(false);
  });

  it('checkConfusables flags Cyrillic lookalike', () => {
    const r = checkConfusables('\u0410pple');
    expect(r.ok).toBe(false);
  });

  it('checkConfusables flags Greek lookalike', () => {
    const r = checkConfusables('\u0391pple');
    expect(r.ok).toBe(false);
  });

  it('checkConfusables accepts plain Latin', () => {
    expect(checkConfusables('apple').ok).toBe(true);
  });

  it('looksLikeConfusable recognizes Cyrillic A', () => {
    expect(looksLikeConfusable('\u0410')).toBe(true);
  });

  it('confusableSkeleton maps lookalikes', () => {
    expect(confusableSkeleton('\u0410pple')).toBe('apple');
  });

  it('analyzeIdentifier finds non-NFC', () => {
    const id = analyzeIdentifier('e\u0301');
    expect(id.findings.some(f => f.code === 'GSPL-SOURCE-NONNORMALIZED-IDENTIFIER')).toBe(true);
    expect(id.normalized).toBe('\u00e9');
  });

  it('analyzeIdentifier finds mixed-script', () => {
    const id = analyzeIdentifier('Hello\u0410');
    expect(id.findings.some(f => f.code === 'GSPL-SOURCE-MIXED-SCRIPT-IDENTIFIER')).toBe(true);
  });

  it('analyzeIdentifier finds leading combining mark', () => {
    const id = analyzeIdentifier('\u0301abc');
    expect(id.findings.some(f => f.code === 'GSPL-SOURCE-LEADING-COMBINING-MARK')).toBe(true);
  });

  it('analyzeIdentifier finds confusable', () => {
    const id = analyzeIdentifier('\u0410pple');
    expect(id.findings.some(f => f.code === 'GSPL-SOURCE-CONFUSABLE-IDENTIFIER')).toBe(true);
  });

  it('isIdentifierStartChar recognizes _', () => {
    expect(isIdentifierStartChar('_')).toBe(true);
  });

  it('isIdentifierStartChar rejects digit', () => {
    expect(isIdentifierStartChar('5')).toBe(false);
  });

  it('isIdentifierContinueChar accepts digit after ident', () => {
    expect(isIdentifierContinueChar('5')).toBe(true);
  });
});

describe('InMemorySourceLoader', () => {
  it('loadSync returns ok for provided path', () => {
    const loader = new InMemorySourceLoader();
    loader.provide('a.gspl', 'hello');
    const r = loader.loadSync(defaultRequest('a.gspl'));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.document!.text).toBe('hello');
      expect(r.document!.hadBom).toBe(false);
    }
  });

  it('loadSync returns diagnostic for missing path', () => {
    const loader = new InMemorySourceLoader();
    const r = loader.loadSync(defaultRequest('missing.gspl'));
    expect(r.ok).toBe(false);
    expect(r.diagnostics[0]!.code).toBe('GSPL-SOURCE-NOT-FOUND');
  });

  it('loadSync rejects path traversal', () => {
    const loader = new InMemorySourceLoader();
    loader.provide('a.gspl', 'hi');
    const r = loader.loadSync(defaultRequest('../escape'));
    expect(r.ok).toBe(false);
  });

  it('hadBom is exposed when provided', () => {
    const loader = new InMemorySourceLoader();
    loader.provide('a.gspl', 'hi', true);
    const r = loader.loadSync(defaultRequest('a.gspl'));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.document!.hadBom).toBe(true);
  });
});

describe('FilesystemSourceLoader — path security', () => {
  it('requires absolute root', () => {
    expect(() => new FilesystemSourceLoader('relative')).toThrow();
  });

  it('rejects absolute path', () => {
    const loader = new FilesystemSourceLoader('/tmp');
    const r = loader.loadSync(defaultRequest('/etc/passwd'));
    expect(r.ok).toBe(false);
    expect(r.diagnostics[0]!.code).toBe('GSPL-SOURCE-PATH-ABSOLUTE');
  });

  it('rejects drive-letter path', () => {
    const loader = new FilesystemSourceLoader('/tmp');
    const r = loader.loadSync(defaultRequest('C:/Windows'));
    expect(r.ok).toBe(false);
    expect(r.diagnostics[0]!.code).toBe('GSPL-SOURCE-PATH-DRIVE');
  });

  it('rejects UNC path', () => {
    const loader = new FilesystemSourceLoader('/tmp');
    const r = loader.loadSync(defaultRequest('//server/share'));
    expect(r.ok).toBe(false);
  });

  it('rejects traversal', () => {
    const loader = new FilesystemSourceLoader('/tmp');
    const r = loader.loadSync(defaultRequest('../escape'));
    expect(r.ok).toBe(false);
  });
});

describe('makeDiagnostic factory', () => {
  it('produces canonical diagnostic by default', () => {
    const d = makeDiagnostic({
      code: 'X',
      message: 'x',
      severity: 'error',
      span: { sourceId: '' as never, start: 0, end: 0 },
      category: 'test',
      phase: 'test',
    });
    expect(d.canonical).toBe(true);
  });
});
