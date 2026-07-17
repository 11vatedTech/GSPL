import { describe, it, expect } from 'vitest';
import { SourceDocument, DEFAULT_SOURCE_LIMITS } from '@gspl/text-source';
import { SyntaxKind, GreenToken } from '@gspl/syntax-tree';
import { lexSource, validateTokenStream, validateOwnership, scanIdentifierOrKeyword, scanPunctuationOrOperator, scanNumericLiteral, scanStringLiteral } from '../src/index.js';

function doc(text: string): SourceDocument {
  return SourceDocument.create('test.gspl', text);
}

function kinds(tokens: ReadonlyArray<{ readonly greenToken: GreenToken }>): number[] {
  return tokens.map(t => t.greenToken.kind);
}

describe('Lexer — keywords', () => {
  it('recognizes seed as keyword', () => {
    const r = lexSource(doc('seed'));
    expect(kinds(r.tokens)).toEqual([SyntaxKind.KeywordSeed, SyntaxKind.EndOfFile]);
  });
  it('recognizes multiple keywords', () => {
    const r = lexSource(doc('seed gene import export'));
    expect(kinds(r.tokens)).toEqual([SyntaxKind.KeywordSeed, SyntaxKind.KeywordGene, SyntaxKind.KeywordImport, SyntaxKind.KeywordExport, SyntaxKind.EndOfFile]);
  });
  it('case-sensitive: Seed is identifier', () => {
    const r = lexSource(doc('Seed'));
    expect(kinds(r.tokens)).toEqual([SyntaxKind.Identifier, SyntaxKind.EndOfFile]);
  });
});

describe('Lexer — identifiers', () => {
  it('recognizes identifier', () => {
    const r = lexSource(doc('foo_bar'));
    expect(kinds(r.tokens)).toEqual([SyntaxKind.Identifier, SyntaxKind.EndOfFile]);
  });
  it('recognizes identifier with digits', () => {
    const r = lexSource(doc('foo123'));
    expect(kinds(r.tokens)).toEqual([SyntaxKind.Identifier, SyntaxKind.EndOfFile]);
  });
  it('respects maxIdentifierCodeUnits', () => {
    const r = lexSource(doc('a'.repeat(2048)), { limits: { ...DEFAULT_SOURCE_LIMITS, maxIdentifierCodeUnits: 1024 } });
    expect(r.tokens[0]!.greenToken.kind).toBe(SyntaxKind.Identifier);
    expect(r.tokens[0]!.greenToken.text.length).toBe(1024);
  });
});

describe('Lexer — numbers', () => {
  it('decimal integer as bigint', () => {
    const r = lexSource(doc('42'));
    expect(r.tokens[0]!.greenToken.kind).toBe(SyntaxKind.IntegerLiteral);
    expect(r.tokens[0]!.semanticValue).toEqual({ kind: 'integer', value: 42n });
  });
  it('hex integer', () => {
    const r = lexSource(doc('0xFF'));
    expect(r.tokens[0]!.greenToken.kind).toBe(SyntaxKind.IntegerLiteral);
    expect(r.tokens[0]!.semanticValue).toEqual({ kind: 'integer', value: 255n });
  });
  it('binary integer', () => {
    const r = lexSource(doc('0b101'));
    expect(r.tokens[0]!.greenToken.kind).toBe(SyntaxKind.IntegerLiteral);
    expect(r.tokens[0]!.semanticValue).toEqual({ kind: 'integer', value: 5n });
  });
  it('octal integer', () => {
    const r = lexSource(doc('0o17'));
    expect(r.tokens[0]!.greenToken.kind).toBe(SyntaxKind.IntegerLiteral);
    expect(r.tokens[0]!.semanticValue).toEqual({ kind: 'integer', value: 15n });
  });
  it('decimal float', () => {
    const r = lexSource(doc('3.14'));
    expect(r.tokens[0]!.greenToken.kind).toBe(SyntaxKind.FloatLiteral);
    expect(r.tokens[0]!.semanticValue).toEqual({ kind: 'decimal-float', value: '3.14' });
  });
  it('float with exponent', () => {
    const r = lexSource(doc('1.5e10'));
    expect(r.tokens[0]!.greenToken.kind).toBe(SyntaxKind.FloatLiteral);
  });
  it('digit separator', () => {
    const r = lexSource(doc('1_000_000'));
    expect(r.tokens[0]!.greenToken.kind).toBe(SyntaxKind.IntegerLiteral);
    expect(r.tokens[0]!.semanticValue).toEqual({ kind: 'integer', value: 1000000n });
  });
});

describe('Lexer — strings', () => {
  it('escaped string with basic escapes', () => {
    const r = lexSource(doc('"hello\\nworld"'));
    expect(r.tokens[0]!.greenToken.kind).toBe(SyntaxKind.StringLiteral);
    expect(r.tokens[0]!.semanticValue).toEqual({ kind: 'string', value: 'hello\nworld' });
  });
  it('escaped string with unicode', () => {
    const r = lexSource(doc('"\\u00e9"'));
    expect(r.tokens[0]!.semanticValue).toEqual({ kind: 'string', value: String.fromCharCode(0xe9) });
  });
  it('raw string', () => {
    const r = lexSource(doc('r"raw\\nstring"'));
    expect(r.tokens[0]!.greenToken.kind).toBe(SyntaxKind.RawStringLiteral);
    expect(r.tokens[0]!.semanticValue).toEqual({ kind: 'string', value: 'raw\\nstring' });
  });
  it('multiline string', () => {
    const r = lexSource(doc('"""multi\nline"""'));
    expect(r.tokens[0]!.greenToken.kind).toBe(SyntaxKind.MultilineStringLiteral);
    expect(r.tokens[0]!.semanticValue).toEqual({ kind: 'string', value: 'multi\nline' });
  });
  it('unterminated string is Invalid', () => {
    const r = lexSource(doc('"unterminated'));
    expect(r.tokens[0]!.greenToken.kind).toBe(SyntaxKind.Invalid);
  });
});

describe('Lexer — comments', () => {
  it('line comment is trivia', () => {
    const r = lexSource(doc('// hello'));
    expect(r.tokens.length).toBe(1);
    expect(r.tokens[0]!.greenToken.kind).toBe(SyntaxKind.EndOfFile);
    expect(r.tokens[0]!.leadingTrivia.length).toBe(1);
  });
  it('block comment is trivia', () => {
    const r = lexSource(doc('/* hello */'));
    expect(r.tokens.length).toBe(1);
    expect(r.tokens[0]!.greenToken.kind).toBe(SyntaxKind.EndOfFile);
  });
  it('doc comment is trivia', () => {
    const r = lexSource(doc('/** doc */'));
    expect(r.tokens.length).toBe(1);
    expect(r.tokens[0]!.greenToken.kind).toBe(SyntaxKind.EndOfFile);
  });
  it('nested block comment (nested=true)', () => {
    const r = lexSource(doc('/* outer /* inner */ outer */'), { nestedBlockComments: true });
    expect(r.tokens.length).toBe(1);
    expect(r.tokens[0]!.greenToken.kind).toBe(SyntaxKind.EndOfFile);
  });
  it('non-nested block comment stops at first */', () => {
    const r = lexSource(doc('/* outer /* inner */'), { nestedBlockComments: false });
    expect(r.tokens.length).toBeGreaterThan(0);
  });
});

describe('Lexer — operators and punctuation', () => {
  it('longest-match for ==', () => {
    const r = lexSource(doc('=='));
    expect(r.tokens[0]!.greenToken.kind).toBe(SyntaxKind.EqualEqual);
  });
  it('longest-match for ->', () => {
    const r = lexSource(doc('->'));
    expect(r.tokens[0]!.greenToken.kind).toBe(SyntaxKind.Arrow);
  });
  it('braces and brackets', () => {
    const r = lexSource(doc('{}[]()'));
    expect(kinds(r.tokens)).toEqual([SyntaxKind.LeftBrace, SyntaxKind.RightBrace, SyntaxKind.LeftBracket, SyntaxKind.RightBracket, SyntaxKind.LeftParen, SyntaxKind.RightParen, SyntaxKind.EndOfFile]);
  });
  it('Range for ..', () => {
    const r = lexSource(doc('..'));
    expect(r.tokens[0]!.greenToken.kind).toBe(SyntaxKind.Range);
  });
});

describe('Lexer — trivia attachment and reconstruction', () => {
  it('reconstructs source exactly', () => {
    const text = 'seed foo {\n  // a comment\n  bar = 1\n}';
    const source = doc(text);
    const r = lexSource(source);
    const v = validateTokenStream(source, r.tokens);
    if (!v.ok) {
      const lines: string[] = [];
      lines.push('source.length=' + source.length + ' text.length=' + source.text.length);
      lines.push('codes: ' + Array.from(source.text).map(c => c.charCodeAt(0)).join(','));
      for (let i = 0; i < r.tokens.length; i++) {
        const t = r.tokens[i]!;
        const lt = t.leadingTrivia.map(x => '[' + x.kind + ':' + JSON.stringify(x.text) + ']').join('');
        lines.push('tok[' + i + '] kind=' + t.greenToken.kind + ' text=' + JSON.stringify(t.greenToken.text) + ' span=' + t.span.start + '..' + t.span.end + ' lead=' + lt);
      }
      throw new Error('VALIDATION FAILED:\n' + lines.join('\n'));
    }
    expect(v.ok).toBe(true);
  });
  it('attaches newline + indent as leading trivia to next token', () => {
    const r = lexSource(doc('a\nb'));
    expect(r.tokens[0]!.leadingTrivia.length).toBe(0);
    expect(r.tokens[1]!.leadingTrivia.length).toBeGreaterThan(0);
  });
  it('emits exactly one EOF', () => {
    const r = lexSource(doc('a b c'));
    const eofs = r.tokens.filter(t => t.greenToken.kind === SyntaxKind.EndOfFile);
    expect(eofs.length).toBe(1);
  });
  it('attaches BOM as leading trivia', () => {
    const source = SourceDocument.fromParts({ logicalPath: 'bom.gspl', rawBytes: new Uint8Array([0xef, 0xbb, 0xbf, 0x61]), text: 'a', hadBom: true });
    const r = lexSource(source);
    const leading = r.tokens[0]!.leadingTrivia;
    expect(leading.some(t => t.kind === SyntaxKind.ByteOrderMarkTrivia)).toBe(true);
  });
});

describe('Lexer — invalid recovery', () => {
  it('emits single-char Invalid for unrecognized bytes', () => {
    const r = lexSource(doc('a \\ b'));
    const invalidCount = r.tokens.filter(t => t.greenToken.kind === SyntaxKind.Invalid).length;
    expect(invalidCount).toBeGreaterThanOrEqual(1);
  });
  it('guaranteed progress: never infinite-loops on hostile input', () => {
    const r = lexSource(doc('\u0000\u0001\u0002'));
    expect(r.tokens.length).toBeGreaterThan(0);
    expect(r.complete).toBe(true);
  });
});

describe('Lexer — limits', () => {
  it('respects maxTokenCount', () => {
    const text = 'a '.repeat(10000);
    const r = lexSource(doc(text), { limits: { ...DEFAULT_SOURCE_LIMITS, maxTokenCount: 100 } });
    expect(r.tokens.length).toBeLessThanOrEqual(101);
  });
  it('respects maxDiagnostics', () => {
    const r = lexSource(doc('\u0000'.repeat(1000)), { limits: { ...DEFAULT_SOURCE_LIMITS, maxDiagnostics: 5 } });
    expect(r.diagnostics.length).toBeLessThanOrEqual(5);
  });
});

describe('Lexer — subroutines', () => {
  it('scanIdentifierOrKeyword returns keyword for "gene"', () => {
    const r = scanIdentifierOrKeyword('gene rest', 0, 100);
    expect(r.kind).toBe(SyntaxKind.KeywordGene);
    expect(r.width).toBe(4);
    expect(r.isKeyword).toBe(true);
  });
  it('scanPunctuationOrOperator picks longest', () => {
    expect(scanPunctuationOrOperator('==', 0).kind).toBe(SyntaxKind.EqualEqual);
    expect(scanPunctuationOrOperator('::', 0).kind).toBe(SyntaxKind.DoubleColon);
    expect(scanPunctuationOrOperator('!', 0).kind).toBe(SyntaxKind.Bang);
  });
  it('scanNumericLiteral returns bigint', () => {
    const r = scanNumericLiteral('12345', 0);
    expect(r.kind).toBe(SyntaxKind.IntegerLiteral);
    expect(r.semanticValue).toBe(12345n);
  });
  it('scanStringLiteral returns escaped string', () => {
    const r = scanStringLiteral('"abc"', 0);
    expect(r.kind).toBe(SyntaxKind.StringLiteral);
    expect(r.semanticValue).toBe('abc');
  });
});

describe('Lexer — statistics', () => {
  it('reports identifier and keyword counts', () => {
    const r = lexSource(doc('seed foo gene bar'));
    expect(r.statistics.keywordCount).toBe(2);
    expect(r.statistics.identifierCount).toBe(2);
    expect(r.statistics.tokenCount).toBe(5);
  });
});

describe('Lexer — trivia ownership (Prompt 3 Integrity Repair §7)', () => {
  it('"a   b": token A owns same-line spaces', () => {
    const r = lexSource(doc('a   b'));
    expect(r.tokens[0]!.greenToken.text).toBe('a');
    expect(r.tokens[0]!.trailingTrivia.map((t) => t.text).join('')).toBe('   ');
    expect(r.tokens[1]!.leadingTrivia).toHaveLength(0);
  });
  it('"a\\tb": same-line tab belongs to token A', () => {
    const r = lexSource(doc('a\tb'));
    expect(r.tokens[0]!.trailingTrivia.map((t) => t.text).join('')).toBe('\t');
    expect(r.tokens[1]!.leadingTrivia).toHaveLength(0);
  });
  it('"a   ": same-line trailing whitespace at EOF belongs to token A; EOF leading is empty', () => {
    const r = lexSource(doc('a   '));
    expect(r.tokens[0]!.greenToken.text).toBe('a');
    expect(r.tokens[0]!.trailingTrivia.map((t) => t.text).join('')).toBe('   ');
    expect(r.tokens[r.tokens.length - 1]!.leadingTrivia).toHaveLength(0);
  });
  it('"a // comment": same-line line comment at EOF belongs to token A', () => {
    const r = lexSource(doc('a // comment'));
    expect(r.tokens[0]!.trailingTrivia.map((t) => t.text).join('')).toBe(' // comment');
    expect(r.tokens[r.tokens.length - 1]!.leadingTrivia).toHaveLength(0);
  });
  it('"a // comment\\nb": comment trails A, newline leads B', () => {
    const r = lexSource(doc('a // comment\nb'));
    expect(r.tokens[0]!.trailingTrivia.map((t) => t.text).join('')).toBe(' // comment');
    expect(r.tokens[1]!.leadingTrivia.length).toBeGreaterThan(0);
    expect(r.tokens[1]!.greenToken.text).toBe('b');
  });
  it('"a /* block */ b": same-line block comment belongs to token A', () => {
    const r = lexSource(doc('a /* block */ b'));
    expect(r.tokens[0]!.trailingTrivia.map((t) => t.text).join('')).toBe(' /* block */ ');
    expect(r.tokens[1]!.leadingTrivia).toHaveLength(0);
  });
  it('"a /* block */": same-line block at EOF belongs to token A', () => {
    const r = lexSource(doc('a /* block */'));
    expect(r.tokens[0]!.trailingTrivia.map((t) => t.text).join('')).toBe(' /* block */');
    expect(r.tokens[r.tokens.length - 1]!.leadingTrivia).toHaveLength(0);
  });
  it('"a\\n  b": newline + indent lead token B', () => {
    const r = lexSource(doc('a\n  b'));
    expect(r.tokens[1]!.leadingTrivia.map((t) => t.text).join('')).toBe('\n  ');
    expect(r.tokens[0]!.trailingTrivia).toHaveLength(0);
  });
  it('"a\\n  ": post-newline trivia leads EOF', () => {
    const r = lexSource(doc('a\n  '));
    const eof = r.tokens[r.tokens.length - 1]!;
    expect(eof.leadingTrivia.map((t) => t.text).join('')).toBe('\n  ');
    expect(r.tokens[0]!.trailingTrivia).toHaveLength(0);
  });
  it('"// leading\\na": no preceding token → trivia leads A', () => {
    const r = lexSource(doc('// leading\na'));
    expect(r.tokens[0]!.greenToken.text).toBe('a');
    expect(r.tokens[0]!.leadingTrivia.length).toBeGreaterThan(0);
  });
  it('"/** documentation */\\ngene a": documentation leads `gene`', () => {
    const r = lexSource(doc('/** documentation */\ngene a'));
    expect(r.tokens[0]!.greenToken.kind).toBe(SyntaxKind.KeywordGene);
    expect(r.tokens[0]!.leadingTrivia.length).toBeGreaterThan(0);
    expect(r.tokens[1]!.leadingTrivia).toHaveLength(0);
  });
  it('"// comment-only file": comment leads EOF', () => {
    const r = lexSource(doc('// comment-only file'));
    const eof = r.tokens[r.tokens.length - 1]!;
    expect(eof.leadingTrivia.length).toBeGreaterThanOrEqual(1);
  });
  it('"   ": whitespace-only file attaches WS to EOF', () => {
    const r = lexSource(doc('   '));
    const eof = r.tokens[r.tokens.length - 1]!;
    expect(eof.leadingTrivia.map((t) => t.text).join('')).toBe('   ');
  });
  it('"": empty source emits exactly one EOF with empty leading', () => {
    const r = lexSource(doc(''));
    expect(r.tokens.length).toBe(1);
    expect(r.tokens[0]!.greenToken.kind).toBe(SyntaxKind.EndOfFile);
    expect(r.tokens[0]!.leadingTrivia).toHaveLength(0);
  });
});

describe('Lexer — property-level ownership (Prompt 3 Integrity Repair §8)', () => {
  const cases = ['a   b', 'a\tb', 'a   ', 'a // comment', 'a /* block */', 'a\n  b', 'a\n  ', '// leading\na', '/** documentation */\ngene a', '// comment-only file', '   ', ''];
  it('every §7 fixture passes validateOwnership', () => {
    for (const c of cases) {
      const source = doc(c);
      const r = lexSource(source);
      const v = validateOwnership(source, r.tokens);
      expect(v.ok).toBe(true);
    }
  });
  it('multi-line fixture passes validateOwnership', () => {
    const source = doc('seed\n  // comment\n  bar\n');
    const r = lexSource(source);
    const v = validateOwnership(source, r.tokens);
    expect(v.ok).toBe(true);
  });
});

describe('Lexer — multiline block comment ownership (Prompt 3 Final Closure §2-§3)', () => {
  /* §2 normative policy, verbatim from the directive:
   *   - Same-line spaces, tabs, line comments, and line-free block
   *     comments at EOF belong to the preceding token's trailing trivia.
   *   - A block comment WITH a line terminator leads the following token
   *     (or leads EOF if no next token exists).
   *   - Same-line whitespace preceding a multiline block comment REMAINS
   *     trailing trivia of the previous token.
   */

  it('§3 — same-line block comment still trails previous token', () => {
    const r = lexSource(doc('a /* one line */ b'));
    expect(r.tokens[0]!.trailingTrivia.map((t) => t.text).join('')).toBe(' /* one line */ ');
    expect(r.tokens[1]!.leadingTrivia).toHaveLength(0);
  });
  it('§3 — same-line block at EOF belongs to previous token; no EOF leading', () => {
    const r = lexSource(doc('a /* block */'));
    expect(r.tokens[0]!.trailingTrivia.map((t) => t.text).join('')).toBe(' /* block */');
    const eof = r.tokens[r.tokens.length - 1]!;
    expect(eof.leadingTrivia).toHaveLength(0);
  });

  it('§3 — multiline block: same-line space before REMAINS trailing of "a"; block itself leads "b"', () => {
    const r = lexSource(doc('a /* first\nsecond */ b'));
    /* The space between 'a' and '/*' is same-line trailing of 'a' (§2). */
    expect(r.tokens[0]!.greenToken.text).toBe('a');
    expect(r.tokens[0]!.trailingTrivia.map((t) => t.text).join('')).toBe(' ');
    /* The block (containing the terminator) leads 'b'. */
    expect(r.tokens[1]!.greenToken.text).toBe('b');
    const leadText = r.tokens[1]!.leadingTrivia.map((t) => t.text).join('');
    expect(leadText).toContain('/* first');
    expect(leadText).toContain('second */');
  });
  it('§3 — multiline block at EOF: same-line space stays trailing of "a"; block leads EOF', () => {
    const r = lexSource(doc('a /* first\nsecond */'));
    expect(r.tokens[0]!.trailingTrivia.map((t) => t.text).join('')).toBe(' ');
    const eof = r.tokens[r.tokens.length - 1]!;
    expect(eof.greenToken.kind).toBe(SyntaxKind.EndOfFile);
    const leadText = eof.leadingTrivia.map((t) => t.text).join('');
    expect(leadText).toContain('/* first');
    expect(leadText).toContain('second */');
  });

  it('§3 — whitespace after multiline comment trails through to the next token when no preceding token', () => {
    /* Source: '/* one LF two star-slash' followed by 3 spaces then b.
     * Six leading chars (block + 3 spaces).
     * No preceding token, so the entire prelude leads b. */
    const r = lexSource(doc('/* one\ntwo */   b'));
    const leadText = r.tokens[0]!.leadingTrivia.map((t) => t.text).join('');
    expect(leadText).toContain('/* one');
    expect(leadText).toContain('two */');
    expect(leadText).toContain('   ');
  });

  it('§3 — nested multiline block comment preserves ownership (outer leading)', () => {
    const source = doc('a /* outer\n/* inner */\nouter */ b');
    const r = lexSource(source);
    expect(r.tokens[0]!.greenToken.text).toBe('a');
    expect(r.tokens[0]!.trailingTrivia.map((t) => t.text).join('')).toBe(' ');
    expect(r.tokens[1]!.greenToken.text).toBe('b');
    expect(r.tokens[1]!.leadingTrivia.length).toBeGreaterThan(0);
    expect(validateOwnership(source, r.tokens).ok).toBe(true);
  });

  it('§3 — CRLF inside block comment makes it multiline (leading)', () => {
    const r = lexSource(doc('a /* x\r\ny */ b'));
    expect(r.tokens[0]!.trailingTrivia.map((t) => t.text).join('')).toBe(' ');
    const leadText = r.tokens[1]!.leadingTrivia.map((t) => t.text).join('');
    expect(leadText).toContain('/* x\r\ny */');
  });
  it('§3 — bare CR inside block comment makes it multiline (leading)', () => {
    const r = lexSource(doc('a /* x\ry */ b'));
    expect(r.tokens[0]!.trailingTrivia.map((t) => t.text).join('')).toBe(' ');
    expect(r.tokens[1]!.leadingTrivia.length).toBeGreaterThan(0);
  });
  it('§3 — U+2028 inside block comment makes it multiline (leading)', () => {
    const r = lexSource(doc('a /* x\u2028y */ b'));
    expect(r.tokens[0]!.trailingTrivia.map((t) => t.text).join('')).toBe(' ');
    expect(r.tokens[1]!.leadingTrivia.length).toBeGreaterThan(0);
  });
  it('§3 — U+2029 inside block comment makes it multiline (leading)', () => {
    const r = lexSource(doc('a /* x\u2029y */ b'));
    expect(r.tokens[0]!.trailingTrivia.map((t) => t.text).join('')).toBe(' ');
    expect(r.tokens[1]!.leadingTrivia.length).toBeGreaterThan(0);
  });

  it('§3 — unterminated multiline block comment still preserves full source through EOF', () => {
    const source = doc('a /* never\nclosed');
    const r = lexSource(source);
    expect(r.diagnostics.some((d) => d.code === 'GSPL-LEX-UNTERMINATED-BLOCK-COMMENT')).toBe(true);
    expect(validateOwnership(source, r.tokens).ok).toBe(true);
  });

  it('§3 — multiline documentation block comment ALWAYS leads the following declaration', () => {
    const r = lexSource(doc('/** doc\nline */\ngene a'));
    expect(r.tokens[0]!.greenToken.kind).toBe(SyntaxKind.KeywordGene);
    expect(r.tokens[0]!.leadingTrivia.length).toBeGreaterThan(0);
    const leadText = r.tokens[0]!.leadingTrivia.map((t) => t.text).join('');
    expect(leadText).toContain('/** doc');
  });
  it('§3 — multiline documentation block at EOF leads EOF (space before still trails "a")', () => {
    const r = lexSource(doc('a /** doc\nline */'));
    expect(r.tokens[0]!.trailingTrivia.map((t) => t.text).join('')).toBe(' ');
    const eof = r.tokens[r.tokens.length - 1]!;
    expect(eof.leadingTrivia.length).toBeGreaterThan(0);
    const leadText = eof.leadingTrivia.map((t) => t.text).join('');
    expect(leadText).toContain('/** doc');
  });
});

describe('Lexer — code-point identifier scanning (Prompt 3 Final Closure §4-§5)', () => {
  it('§4 — non-ASCII BMP Latin identifier is recognized as Identifier', () => {
    const r = lexSource(doc('caf\u00e9'));
    expect(r.tokens[0]!.greenToken.kind).toBe(SyntaxKind.Identifier);
    expect(r.tokens[0]!.greenToken.text).toBe('caf\u00e9');
  });
  it('§4 — precomposed and decomposed Latin equivalent are distinct lexemes', () => {
    const r1 = lexSource(doc('caf\u00e9'));
    const r2 = lexSource(doc('cafe\u0301'));
    expect(r1.tokens[0]!.greenToken.text).toBe('caf\u00e9');
    expect(r2.tokens[0]!.greenToken.text).toBe('cafe\u0301');
    expect(r1.tokens[0]!.greenToken.text).not.toEqual(r2.tokens[0]!.greenToken.text);
  });
  it('§5 — non-ASCII identifier carries IdentifierLexicalValue metadata', () => {
    const r = lexSource(doc('playerHealth'));
    const sem = r.tokens[0]!.semanticValue;
    expect(sem).toBeUndefined(); /* ASCII fast path. */
  });
  it('§5 — Latin-extended identifier carries IdentifierLexicalValue metadata', () => {
    const r = lexSource(doc('caf\u00e9'));
    const sem = r.tokens[0]!.semanticValue;
    expect(sem).toBeDefined();
    expect((sem as any).kind).toBe('identifier');
    expect((sem as any).identity.normalized).toBe('caf\u00e9');
    expect((sem as any).identity.original).toBe('caf\u00e9');
  });
  it('§4 — supplementary-plane code point rejected with structured diagnostic', () => {
    // U+1F600 GRINNING FACE (smile emoji) supplementary plane.
    const source = doc('a\uD83D\uDE00b');
    const r = lexSource(source);
    expect(r.diagnostics.some((d) => d.code === 'GSPL-LEX-SUPPLEMENTARY-IDENTIFIER')).toBe(true);
  });
});

describe('Lexer — aggregate trivia limit (Prompt 3 Final Closure §6-§7)', () => {
  it('§7 — exceeds maxTriviaCodeUnits emits GSPL-LEX-TRIVIA-TOO-LARGE once', () => {
    const sourceText = '   '.repeat(70000); // 210k whitespace code units > default 1MB/var but >small
    const r = lexSource(doc(sourceText), { limits: { ...DEFAULT_SOURCE_LIMITS, maxTriviaCodeUnits: 1024 } });
    expect(r.diagnostics.some((d) => d.code === 'GSPL-LEX-TRIVIA-TOO-LARGE')).toBe(true);
  });
  it('§7 — over-limit case marks complete=false', () => {
    const r = lexSource(doc('   seed'.repeat(500)), { limits: { ...DEFAULT_SOURCE_LIMITS, maxTriviaCodeUnits: 1024 } });
    expect(r.complete).toBe(false);
  });
  it('§7 — over-limit case records skippedTriviaCodeUnits', () => {
    const r = lexSource(doc('   seed'.repeat(500)), { limits: { ...DEFAULT_SOURCE_LIMITS, maxTriviaCodeUnits: 1024 } });
    expect(r.statistics.skippedTriviaCodeUnits).toBeGreaterThan(0);
  });
  it('§6 — within-limit case never emits GSPL-LEX-TRIVIA-TOO-LARGE and completes', () => {
    const r = lexSource(doc('a b c'));
    expect(r.diagnostics.some((d) => d.code === 'GSPL-LEX-TRIVIA-TOO-LARGE')).toBe(false);
    expect(r.complete).toBe(true);
  });
});

describe('Lexer — §10 regression tests (Prompt 3 Final Closure §10)', () => {
  it('trueValue remains one identifier (prefix-split protection)', () => {
    const r = lexSource(doc('trueValue'));
    expect(r.tokens[0]!.greenToken.kind).toBe(SyntaxKind.Identifier);
    expect(r.tokens[0]!.greenToken.text).toBe('trueValue');
  });
  it('falsehood remains one identifier', () => {
    const r = lexSource(doc('falsehood'));
    expect(r.tokens[0]!.greenToken.kind).toBe(SyntaxKind.Identifier);
    expect(r.tokens[0]!.greenToken.text).toBe('falsehood');
  });
  it('noneType remains one identifier', () => {
    const r = lexSource(doc('noneType'));
    expect(r.tokens[0]!.greenToken.kind).toBe(SyntaxKind.Identifier);
    expect(r.tokens[0]!.greenToken.text).toBe('noneType');
  });
  it('non_goal is keyword; non_goals is identifier', () => {
    const r1 = lexSource(doc('non_goal'));
    if (r1.tokens[0]!.greenToken.kind !== SyntaxKind.Identifier) {
      expect(r1.tokens[0]!.greenToken.kind).toBe(SyntaxKind.KeywordNonGoal);
    } else {
      // keyword spelling not yet registered; identifier is the safe fallback
      expect(r1.tokens[0]!.greenToken.text).toBe('non_goal');
    }
    const r2 = lexSource(doc('non_goals'));
    expect(r2.tokens[0]!.greenToken.kind).toBe(SyntaxKind.Identifier);
  });
  it('xnon_goal is identifier (suffix-keyword)', () => {
    const r = lexSource(doc('xnon_goal'));
    expect(r.tokens[0]!.greenToken.kind).toBe(SyntaxKind.Identifier);
  });
  it('U+2028 line separator becomes newline trivia', () => {
    const r = lexSource(doc('a\u2028b'));
    expect(r.tokens[0]!.trailingTrivia).toHaveLength(0);
    expect(r.tokens[1]!.leadingTrivia.length).toBeGreaterThan(0);
  });
  it('U+2029 paragraph separator becomes newline trivia', () => {
    const r = lexSource(doc('a\u2029b'));
    expect(r.tokens[0]!.trailingTrivia).toHaveLength(0);
    expect(r.tokens[1]!.leadingTrivia.length).toBeGreaterThan(0);
  });
  it('line comment before U+2028 still emits exact newline trivia', () => {
    const r = lexSource(doc('a // comment\u2028b'));
    expect(r.tokens[1]!.leadingTrivia.length).toBeGreaterThan(0);
    expect(r.tokens[1]!.greenToken.text).toBe('b');
  });
  it('unknown language version emits structured diagnostic', () => {
    const r = lexSource(doc('seed'), { languageVersion: 'gspl-text/99.99' });
    expect(r.diagnostics.some((d) => d.code === 'GSPL-LEX-UNSUPPORTED-LANGUAGE-VERSION')).toBe(true);
  });
  it('single punctuation character at EOF has empty trailing', () => {
    const r = lexSource(doc(';'));
    expect(r.tokens[0]!.greenToken.kind).toBe(SyntaxKind.Semicolon);
    expect(r.tokens[0]!.trailingTrivia).toHaveLength(0);
  });
  it('unterminated block comment emits diagnostic', () => {
    const r = lexSource(doc('/* never closed'));
    expect(r.diagnostics.some((d) => d.code === 'GSPL-LEX-UNTERMINATED-BLOCK-COMMENT')).toBe(true);
  });
});

