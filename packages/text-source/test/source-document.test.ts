import { describe, it, expect } from 'vitest';
import { SourceDocument } from '../src/source-document.js';
import { checkForbiddenControls, normalizeIdentifier, isNfcNormalized, checkConfusables } from '../src/unicode-security.js';
import { InMemorySourceLoader, FilesystemSourceLoader } from '../src/source-loader.js';

describe('SourceDocument', () => {
  it('produces a deterministic source ID', () => {
    const a = SourceDocument.create('a/b.gspl', 'hello');
    const b = SourceDocument.create('a/b.gspl', 'hello');
    expect(a.id).toBe(b.id);
  });
  it('source ID differs for different text', () => {
    expect(SourceDocument.create('a.gspl', 'hello').id).not.toBe(SourceDocument.create('a.gspl', 'world').id);
  });
  it('source ID differs for different paths', () => {
    expect(SourceDocument.create('a.gspl', 'hello').id).not.toBe(SourceDocument.create('b.gspl', 'hello').id);
  });
  it('positionAt single-line', () => {
    const doc = SourceDocument.create('a.gspl', 'hello');
    expect(doc.positionAt(0)).toEqual({ offset: 0, line: 1, column: 1 });
    expect(doc.positionAt(4)).toEqual({ offset: 4, line: 1, column: 5 });
  });
  it('positionAt multi-line', () => {
    const nl = String.fromCharCode(10);
    const doc = SourceDocument.create('a.gspl', 'a' + nl + 'b' + nl + 'c');
    expect(doc.positionAt(0)).toEqual({ offset: 0, line: 1, column: 1 });
    expect(doc.positionAt(2)).toEqual({ offset: 2, line: 2, column: 1 });
    expect(doc.positionAt(4)).toEqual({ offset: 4, line: 3, column: 1 });
  });
  it('positionAt clamps negative and out-of-range', () => {
    const doc = SourceDocument.create('a.gspl', 'abc');
    expect(doc.positionAt(-10).offset).toBe(0);
    expect(doc.positionAt(999).offset).toBe(3);
  });
  it('lineCount counts newlines', () => {
    const nl = String.fromCharCode(10);
    expect(SourceDocument.create('a.gspl', 'a' + nl + 'b' + nl + 'c').lineCount).toBe(3);
  });
});

describe('Unicode security', () => {
  it('clean text has no findings', () => {
    expect(checkForbiddenControls('seed foo { value 42 }').ok).toBe(true);
  });
  it('rejects zero-width space', () => {
    const zw = String.fromCharCode(0x200B);
    const r = checkForbiddenControls('foo' + zw + 'bar');
    expect(r.ok).toBe(false);
    expect(r.findings.some(f => f.code === 'GSPL-SOURCE-ZERO-WIDTH')).toBe(true);
  });
  it('rejects bidi controls', () => {
    const bidi = String.fromCharCode(0x202E);
    const r = checkForbiddenControls('foo' + bidi + 'bar');
    expect(r.findings.some(f => f.code === 'GSPL-SOURCE-BIDI-CONTROL')).toBe(true);
  });
  it('rejects unpaired surrogate', () => {
    const surr = String.fromCharCode(0xD800);
    const r = checkForbiddenControls('foo' + surr + 'bar');
    expect(r.findings.some(f => f.code === 'GSPL-SOURCE-UNPAIRED-SURROGATE')).toBe(true);
  });
  it('rejects forbidden C0 controls', () => {
    const ctrl = String.fromCharCode(1);
    const r = checkForbiddenControls('foo' + ctrl + 'bar');
    expect(r.findings.some(f => f.code === 'GSPL-SOURCE-FORBIDDEN-CONTROL')).toBe(true);
  });
  it('allows newline and tab as trivia', () => {
    const nl = String.fromCharCode(10);
    const tab = String.fromCharCode(9);
    expect(checkForbiddenControls('foo' + nl + 'bar' + tab + 'baz').ok).toBe(true);
  });
  it('normalizeIdentifier applies NFC', () => {
    const composed = String.fromCharCode(0x00E9);
    const decomposed = 'e' + String.fromCharCode(0x0301);
    expect(normalizeIdentifier(decomposed)).toBe(composed);
  });
  it('isNfcNormalized detects non-NFC', () => {
    const decomposed = 'e' + String.fromCharCode(0x0301);
    expect(isNfcNormalized(decomposed)).toBe(false);
    expect(isNfcNormalized('hello')).toBe(true);
  });
});

describe('checkConfusables', () => {
  it('clean Latin has no confusables', () => {
    expect(checkConfusables('hello_world').findings).toEqual([]);
  });
  it('detects Cyrillic lookalike with correct offset', () => {
    const cyr = String.fromCharCode(0x043E);
    const r = checkConfusables('hell' + cyr);
    const f = r.findings.find(f => f.code === 'GSPL-SOURCE-CONFUSABLE-IDENTIFIER');
    expect(f).toBeDefined();
    expect(f!.offset).toBe(4);
  });
  it('detects Greek lookalike', () => {
    const gr = String.fromCharCode(0x03BF);
    const r = checkConfusables('hell' + gr);
    expect(r.findings.some(f => f.code === 'GSPL-SOURCE-CONFUSABLE-IDENTIFIER')).toBe(true);
  });
});

describe('InMemorySourceLoader', () => {
  it('provides and loads', () => {
    const l = new InMemorySourceLoader();
    l.provide('a.gspl', 'hello');
    expect(l.loadSync('a.gspl').text).toBe('hello');
  });
  it('throws on missing', () => {
    expect(() => new InMemorySourceLoader().loadSync('missing')).toThrow();
  });
});

describe('FilesystemSourceLoader path security', () => {
  it('requires absolute root', () => {
    expect(() => new FilesystemSourceLoader('relative')).toThrow();
  });
  it('rejects traversal', () => {
    expect(() => new FilesystemSourceLoader('/tmp').loadSync('../etc/passwd')).toThrow(/traversal/i);
  });
  it('rejects absolute', () => {
    expect(() => new FilesystemSourceLoader('/tmp').loadSync('/etc/passwd')).toThrow(/absolute/i);
  });
  it('rejects drive-letter', () => {
    expect(() => new FilesystemSourceLoader('/tmp').loadSync('C:/Windows/file')).toThrow(/drive-letter/i);
  });
  it('rejects UNC', () => {
    expect(() => new FilesystemSourceLoader('/tmp').loadSync('//server/share')).toThrow(/UNC/i);
  });
});
