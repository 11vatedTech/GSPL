/**
 * §9 Parser tests -- declaration parsing, expression parsing, recovery, losslessness.
 * Prompt 3 §9.
 */
import { describe, it, expect } from 'vitest';
import { parseText, parseSource, DEFAULT_PARSE_OPTIONS } from '../src/index.js';
import { SyntaxKind, printCST, isRedNode, isRedToken } from '@gspl/syntax-tree';
import { SourceDocument, DEFAULT_SOURCE_LIMITS } from '@gspl/text-source';
import { lexSource } from '@gspl/lexer';

describe('§9.1 Parser API', () => {
  it('parseText returns a ParseResult with a SyntaxTree', () => {
    const result = parseText('test.gspl', 'seed 1.0');
    expect(result.source).toBeDefined();
    expect(result.root).toBeDefined();
    expect(result.root.root).toBeDefined();
    expect(result.diagnostics).toBeDefined();
    expect(result.statistics).toBeDefined();
    expect(result.complete).toBe(true);
  });

  it('parseText returns statistics with correct counts', () => {
    const result = parseText('test.gspl', 'seed 1.0');
    expect(result.statistics.tokenCount).toBeGreaterThan(0);
    expect(result.statistics.nodeCount).toBeGreaterThan(0);
    expect(result.statistics.declarationCount).toBe(1);
  });
});

describe('§9.3 Declaration parsing', () => {
  it('parses a minimal seed declaration', () => {
    const result = parseText('test.gspl', 'seed 1.0');
    expect(result.root.root.kind).toBe(SyntaxKind.CompilationUnit);
    expect(result.statistics.declarationCount).toBe(1);
  });

  it('parses seed with title clause', () => {
    const result = parseText('test.gspl', 'seed 1.0\ntitle "My Game"');
    expect(result.statistics.declarationCount).toBe(1);
  });

  it('parses seed with gene declaration', () => {
    const result = parseText('test.gspl', 'seed 1.0\ngene health: scalar = 100');
    expect(result.statistics.declarationCount).toBe(2);
    expect(result.statistics.expressionCount).toBeGreaterThan(0);
  });

  it('parses seed with constraints block', () => {
    const result = parseText('test.gspl', 'seed 1.0\nconstraints { require health > 0 }');
    expect(result.statistics.nodeCount).toBeGreaterThan(3);
  });

  it('parses seed with effects block', () => {
    const result = parseText('test.gspl', 'seed 1.0\neffects { filesystem = read_only }');
    expect(result.statistics.nodeCount).toBeGreaterThanOrEqual(3);
  });

  it('parses seed with budget block', () => {
    const result = parseText('test.gspl', 'seed 1.0\nbudget { max_time_ms = 5000 }');
    expect(result.statistics.nodeCount).toBeGreaterThanOrEqual(3);
  });

  it('parses seed with import declaration', () => {
    const result = parseText('test.gspl', 'import "./shared.gspl" as shared\nseed 1.0');
    expect(result.statistics.nodeCount).toBeGreaterThan(2);
  });

  it('parses seed with private gene', () => {
    const result = parseText('test.gspl', 'seed 1.0\nprivate gene temp: scalar = 50');
    expect(result.statistics.declarationCount).toBe(2);
  });
});

describe('§9.4 Expression parsing', () => {
  it('parses integer literal', () => {
    const result = parseText('test.gspl', 'seed 1.0\ngene x: scalar = 42');
    expect(result.statistics.expressionCount).toBeGreaterThan(0);
  });

  it('parses string literal', () => {
    const result = parseText('test.gspl', 'seed 1.0\ngene name: scalar = "hello"');
    expect(result.statistics.expressionCount).toBeGreaterThan(0);
  });

  it('parses boolean literal', () => {
    const result = parseText('test.gspl', 'seed 1.0\ngene flag: scalar = true');
    expect(result.statistics.expressionCount).toBeGreaterThan(0);
  });

  it('parses absence literal', () => {
    const result = parseText('test.gspl', 'seed 1.0\ngene opt: scalar = none');
    expect(result.statistics.expressionCount).toBeGreaterThan(0);
  });

  it('parses binary expression with precedence', () => {
    const result = parseText('test.gspl', 'seed 1.0\ngene x: scalar = 1 + 2 * 3');
    expect(result.statistics.expressionCount).toBeGreaterThan(0);
  });

  it('parses list expression', () => {
    const result = parseText('test.gspl', 'seed 1.0\ngene list: scalar = [1, 2, 3]');
    expect(result.statistics.expressionCount).toBeGreaterThan(0);
  });

  it('parses record expression', () => {
    const result = parseText('test.gspl', 'seed 1.0\ngene rec: scalar = { a: 1, b: 2 }');
    expect(result.statistics.expressionCount).toBeGreaterThan(0);
  });

  it('parses parenthesized expression', () => {
    const result = parseText('test.gspl', 'seed 1.0\ngene x: scalar = (1 + 2) * 3');
    expect(result.statistics.expressionCount).toBeGreaterThan(0);
  });

  it('parses unary negation', () => {
    const result = parseText('test.gspl', 'seed 1.0\ngene x: scalar = -42');
    expect(result.statistics.expressionCount).toBeGreaterThan(0);
  });
});

describe('§9.3 Recovery', () => {
  it('emits diagnostic for missing seed declaration', () => {
    const result = parseText('test.gspl', 'gene x: scalar = 1');
    expect(result.diagnostics.length).toBeGreaterThan(0);
    const hasExpected = result.diagnostics.some(d => d.code === 'GSPL-PARSE-UNEXPECTED-EOF');
    expect(hasExpected).toBe(true);
  });

  it('emits diagnostic for unexpected token at top level', () => {
    const result = parseText('test.gspl', 'garbage seed 1.0');
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });

  it('recovers from missing closing brace', () => {
    const result = parseText('test.gspl', 'seed 1.0\nconstraints { require x > 0');
    expect(result.diagnostics.some(d => d.code === 'GSPL-PARSE-UNEXPECTED-EOF')).toBe(true);
    // Recovery should still produce a tree
    expect(result.root).toBeDefined();
  });

  it('does not crash on empty input', () => {
    const result = parseText('test.gspl', '');
    expect(result.root).toBeDefined();
    expect(result.complete).toBe(true);
  });

  it('does not crash on whitespace-only input', () => {
    const result = parseText('test.gspl', '   \n  ');
    expect(result.root).toBeDefined();
  });

  it('respects maxRecoverySkips limit', () => {
    const opts = { ...DEFAULT_PARSE_OPTIONS, limits: { ...DEFAULT_PARSE_OPTIONS.limits, maxRecoverySkips: 2 } };
    const result = parseText('test.gspl', 'garbage1 garbage2 garbage3 garbage4 seed 1.0', opts);
    // Should hit the recovery skip limit
    expect(result.statistics.recoveryActionCount).toBeGreaterThan(0);
  });
});

describe('§9.5 Losslessness', () => {
  it('printCST(parse(source)) === source for minimal seed', () => {
    const source = 'seed 1.0';
    const result = parseText('test.gspl', source);
    const printed = printCST(result.root);
    // printCST should reconstruct the source (trivia is threaded via TriviaMap)
    expect(printed).toBe(source);
  });

  it('printCST preserves newlines', () => {
    const source = 'seed 1.0\ngene x: scalar = 1';
    const result = parseText('test.gspl', source);
    const printed = printCST(result.root);
    expect(printed).toBe(source);
  });

  it('printCST preserves comments', () => {
    const source = 'seed 1.0\n// comment\ngene x: scalar = 1';
    const result = parseText('test.gspl', source);
    const printed = printCST(result.root);
    expect(printed).toBe(source);
  });

  it('printCST preserves whitespace', () => {
    const source = 'seed    1.0';
    const result = parseText('test.gspl', source);
    const printed = printCST(result.root);
    expect(printed).toBe(source);
  });
});

describe('§9.2 Parser limits', () => {
  it('enforces maxNestingDepth', () => {
    // Deep nesting via nested record expressions
    let source = 'seed 1.0\ngene x: scalar = ';
    for (let i = 0; i < 70; i++) source += '{ a: ';
    source += '1';
    for (let i = 0; i < 70; i++) source += ' }';
    const opts = { ...DEFAULT_PARSE_OPTIONS, limits: { ...DEFAULT_PARSE_OPTIONS.limits, maxNestingDepth: 32 } };
    const result = parseText('test.gspl', source, opts);
    expect(result.diagnostics.some(d => d.message.includes('nesting depth'))).toBe(true);
  });      it('enforces maxExpressionDepth', () => {
        let source = 'seed 1.0\ngene x: scalar = ';
        for (let i = 0; i < 70; i++) source += '1 + ';
        source += '1';
        const opts = { ...DEFAULT_PARSE_OPTIONS, limits: { ...DEFAULT_PARSE_OPTIONS.limits, maxExpressionDepth: 16 } };
        const result = parseText('test.gspl', source, opts);
        expect(result.diagnostics.some(d => d.message.includes('expression depth'))).toBe(true);
      });
    });
