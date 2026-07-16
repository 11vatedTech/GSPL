import { describe, it, expect } from 'vitest';
import { SourceDocument, DEFAULT_SOURCE_LIMITS } from '../../text-source/src/index.js';
import { SyntaxKind, GreenToken } from '../../syntax-tree/src/index.js';
import { lexSource, validateTokenStream, scanIdentifierOrKeyword, scanPunctuationOrOperator, scanNumericLiteral, scanStringLiteral } from '../src/index.js';

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
    expect(r.tokens[0]!.semanticValue).toBe(42n);
  });
  it('hex integer', () => {
    const r = lexSource(doc('0xFF'));
    expect(r.tokens[0]!.greenToken.kind).toBe(SyntaxKind.IntegerLiteral);
    expect(r.tokens[0]!.semanticValue).toBe(255n);
  });
  it('binary integer', () => {
    const r = lexSource(doc('0b101'));
    expect(r.tokens[0]!.greenToken.kind).toBe(SyntaxKind.IntegerLiteral);
    expect(r.tokens[0]!.semanticValue).toBe(5n);
  });
  it('octal integer', () => {
    const r = lexSource(doc('0o17'));
    expect(r.tokens[0]!.greenToken.kind).toBe(SyntaxKind.IntegerLiteral);
    expect(r.tokens[0]!.semanticValue).toBe(15n);
  });
  it('decimal float', () => {
    const r = lexSource(doc('3.14'));
    expect(r.tokens[0]!.greenToken.kind).toBe(SyntaxKind.FloatLiteral);
  });
  it('float with exponent', () => {
    const r = lexSource(doc('1.5e10'));
    expect(r.tokens[0]!.greenToken.kind).toBe(SyntaxKind.FloatLiteral);
  });
  it('digit separator', () => {
    const r = lexSource(doc('1_000_000'));
    expect(r.tokens[0]!.greenToken.kind).toBe(SyntaxKind.IntegerLiteral);
    expect(r.tokens[0]!.semanticValue).toBe(1000000n);
  });
});

describe('Lexer — strings', () => {
  it('escaped string with basic escapes', () => {
    const r = lexSource(doc('"hello\\nworld"'));
    expect(r.tokens[0]!.greenToken.kind).toBe(SyntaxKind.StringLiteral);
    expect(r.tokens[0]!.semanticValue).toBe('hello\nworld');
  });
  it('escaped string with unicode', () => {
    const r = lexSource(doc('"\\u00e9"'));
    expect(r.tokens[0]!.semanticValue).toBe(String.fromCharCode(0xe9));
  });
  it('raw string', () => {
    const r = lexSource(doc('r"raw\\nstring"'));
    expect(r.tokens[0]!.greenToken.kind).toBe(SyntaxKind.RawStringLiteral);
    expect(r.tokens[0]!.semanticValue).toBe('raw\\nstring');
  });
  it('multiline string', () => {
    const r = lexSource(doc('"""multi\nline"""'));
    expect(r.tokens[0]!.greenToken.kind).toBe(SyntaxKind.MultilineStringLiteral);
    expect(r.tokens[0]!.semanticValue).toBe('multi\nline');
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
