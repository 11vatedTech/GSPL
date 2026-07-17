/**
 * §8 CST tests -- green/red tree, losslessness, hash determinism.
 * Prompt 3 §8.3, §8.4.
 */
import { describe, it, expect } from 'vitest';
import {
  SyntaxKind,
  GreenToken,
  GreenTrivia,
  GreenNode,
  GreenNodeBuilder,
  SyntaxFlags,
  createSyntaxTree,
  RedNode,
  RedToken,
  isRedNode,
  isRedToken,
  printCST,
  printRedNode,
  printRedToken,
  classify,
  isTokenKind,
  isCstNodeKind,
  isTriviaKind,
  isRecoveryKind,
  SyntaxKindClassification,
} from '../src/index.js';

describe('§8.1 GreenNode', () => {
  it('GreenNode.create builds an immutable node with correct width', () => {
    const tok = GreenToken.fromText(SyntaxKind.Identifier, 'foo');
    const node = GreenNode.create(SyntaxKind.Expression, [tok]);
    expect(node.kind).toBe(SyntaxKind.Expression);
    expect(node.fullWidth).toBe(3);
    expect(node.childCount).toBe(1);
    expect(Object.isFrozen(node)).toBe(true);
  });

  it('nested green nodes accumulate width correctly', () => {
    const a = GreenToken.fromText(SyntaxKind.Identifier, 'a');
    const b = GreenToken.fromText(SyntaxKind.Identifier, 'b');
    const inner = GreenNode.create(SyntaxKind.Expression, [a]);
    const outer = GreenNode.create(SyntaxKind.Block, [inner, b]);
    expect(inner.fullWidth).toBe(1);
    expect(outer.fullWidth).toBe(2);
  });

  it('stableHash is deterministic for identical structure', () => {
    const tok1 = GreenToken.fromText(SyntaxKind.Identifier, 'x');
    const tok2 = GreenToken.fromText(SyntaxKind.Identifier, 'x');
    const n1 = GreenNode.create(SyntaxKind.Expression, [tok1]);
    const n2 = GreenNode.create(SyntaxKind.Expression, [tok2]);
    expect(n1.stableHash).toBe(n2.stableHash);
  });

  it('stableHash differs for different kind', () => {
    const tok = GreenToken.fromText(SyntaxKind.Identifier, 'x');
    const n1 = GreenNode.create(SyntaxKind.Expression, [tok]);
    const n2 = GreenNode.create(SyntaxKind.Block, [tok]);
    expect(n1.stableHash).not.toBe(n2.stableHash);
  });

  it('stableHash differs for different text', () => {
    const t1 = GreenToken.fromText(SyntaxKind.Identifier, 'x');
    const t2 = GreenToken.fromText(SyntaxKind.Identifier, 'y');
    const n1 = GreenNode.create(SyntaxKind.Expression, [t1]);
    const n2 = GreenNode.create(SyntaxKind.Expression, [t2]);
    expect(n1.stableHash).not.toBe(n2.stableHash);
  });

  it('IsMissing flag produces width=0 child', () => {
    const b = new GreenNodeBuilder(SyntaxKind.LeftBrace);
    b.setMissing();
    const node = b.finalize();
    expect(node.fullWidth).toBe(0);
    expect((node.flags & SyntaxFlags.IsMissing) !== 0).toBe(true);
  });

  it('GreenNodeBuilder accumulates children and finalizes', () => {
    const b = new GreenNodeBuilder(SyntaxKind.SeedDeclaration);
    b.addToken(SyntaxKind.KeywordSeed, 'seed');
    b.addToken(SyntaxKind.VersionLiteral, '1.0');
    const node = b.finalize();
    expect(node.kind).toBe(SyntaxKind.SeedDeclaration);
    expect(node.childCount).toBe(2);
    expect(node.fullWidth).toBe(7); // 'seed'(4) + '1.0'(3)
  });
});

describe('§8.2 RedNode', () => {
  it('createSyntaxTree produces a root with span [0, sourceLength]', () => {
    const tok = GreenToken.fromText(SyntaxKind.Identifier, 'hi');
    const greenRoot = GreenNode.create(SyntaxKind.CompilationUnit, [tok]);
    const tree = createSyntaxTree('src:test' as any, greenRoot, 2);
    expect(tree.root.span.start).toBe(0);
    expect(tree.root.span.end).toBe(2);
  });

  it('red children get absolute offsets', () => {
    const a = GreenToken.fromText(SyntaxKind.Identifier, 'a');
    const b = GreenToken.fromText(SyntaxKind.Identifier, 'b');
    const greenRoot = GreenNode.create(SyntaxKind.CompilationUnit, [a, b]);
    const tree = createSyntaxTree('src:test' as any, greenRoot, 2);
    const children = tree.root.children;
    expect(children.length).toBe(2);
    if (isRedToken(children[0]!)) {
      expect(children[0].span.start).toBe(0);
      expect(children[0].span.end).toBe(1);
    }
    if (isRedToken(children[1]!)) {
      expect(children[1].span.start).toBe(1);
      expect(children[1].span.end).toBe(2);
    }
  });

  it('nested red nodes get correct spans', () => {
    const a = GreenToken.fromText(SyntaxKind.Identifier, 'a');
    const b = GreenToken.fromText(SyntaxKind.Identifier, 'b');
    const inner = GreenNode.create(SyntaxKind.Expression, [a]);
    const outer = GreenNode.create(SyntaxKind.CompilationUnit, [inner, b]);
    const tree = createSyntaxTree('src:test' as any, outer, 2);
    const kids = tree.root.children;
    expect(isRedNode(kids[0]!)).toBe(true);
    if (isRedNode(kids[0]!)) {
      expect(kids[0].span.start).toBe(0);
      expect(kids[0].span.end).toBe(1);
    }
  });

  it('parent link is set correctly', () => {
    const tok = GreenToken.fromText(SyntaxKind.Identifier, 'x');
    const greenRoot = GreenNode.create(SyntaxKind.CompilationUnit, [tok]);
    const tree = createSyntaxTree('src:test' as any, greenRoot, 1);
    expect(tree.root.parent).toBe(null);
    const child = tree.root.children[0]!;
    if (isRedNode(child)) {
      expect(child.parent).toBe(tree.root);
    }
  });

  it('ancestor traversal works', () => {
    const tok = GreenToken.fromText(SyntaxKind.Identifier, 'x');
    const inner = GreenNode.create(SyntaxKind.Expression, [tok]);
    const outer = GreenNode.create(SyntaxKind.CompilationUnit, [inner]);
    const tree = createSyntaxTree('src:test' as any, outer, 1);
    const exprNode = tree.root.children[0]!;
    if (isRedNode(exprNode)) {
      const ancestors = [...exprNode.ancestors];
      expect(ancestors.length).toBe(1);
      expect(ancestors[0]).toBe(tree.root);
    }
  });
});

describe('§8.3 Lossless printCST', () => {
  it('printCST reconstructs simple token text', () => {
    const tok = GreenToken.fromText(SyntaxKind.Identifier, 'hello');
    const greenRoot = GreenNode.create(SyntaxKind.CompilationUnit, [tok]);
    const tree = createSyntaxTree('src:test' as any, greenRoot, 5);
    expect(printCST(tree)).toBe('hello');
  });

  it('printCST reconstructs nested structure', () => {
    const a = GreenToken.fromText(SyntaxKind.Identifier, 'a');
    const b = GreenToken.fromText(SyntaxKind.Identifier, 'b');
    const inner = GreenNode.create(SyntaxKind.Expression, [a]);
    const outer = GreenNode.create(SyntaxKind.CompilationUnit, [inner, b]);
    const tree = createSyntaxTree('src:test' as any, outer, 2);
    expect(printCST(tree)).toBe('ab');
  });

  it('printCST preserves trivia from RedToken', () => {
    const tok = GreenToken.fromText(SyntaxKind.Identifier, 'x');
    const leadingTrivia = [GreenTrivia.fromText(SyntaxKind.WhitespaceTrivia, '   ')];
    const trailingTrivia = [GreenTrivia.fromText(SyntaxKind.WhitespaceTrivia, '  ')];
    const greenRoot = GreenNode.create(SyntaxKind.CompilationUnit, [tok]);
    const tree = createSyntaxTree('src:test' as any, greenRoot, 6);
    // Override root's first child with a RedToken carrying trivia
    const rootRed = tree.root;
    // We need to test printRedToken directly since the tree doesn't inject trivia
    const rt = new RedToken({
      green: tok,
      span: { sourceId: 'src:test' as any, start: 0, end: 1 },
      leadingTrivia,
      trailingTrivia,
    });
    expect(printRedToken(rt)).toBe('   x  ');
  });

  it('empty tree prints empty string', () => {
    const greenRoot = GreenNode.create(SyntaxKind.CompilationUnit, []);
    const tree = createSyntaxTree('src:test' as any, greenRoot, 0);
    expect(printCST(tree)).toBe('');
  });
});

describe('§8.3a End-to-end losslessness with trivia', () => {
  it('printCST reconstructs source with leading/trailing trivia via TriviaMap', () => {
    // Source: '   a   b  ' (3 ws + 'a' + 3 ws + 'b' + 2 ws = 10 chars)
    // Per lexer policy: same-line spaces are trailing trivia of preceding token.
    // So: tokA leading=['   '], trailing=['   ']; tokB leading=[], trailing=['  ']
    // TriviaMap is keyed by GREEN-TREE-LOCAL offset (accumulated green child width).
    const sourceText = '   a   b  ';
    const tokA = GreenToken.fromText(SyntaxKind.Identifier, 'a');
    const tokB = GreenToken.fromText(SyntaxKind.Identifier, 'b');
    const wsLead = GreenTrivia.fromText(SyntaxKind.WhitespaceTrivia, '   ');
    const wsTrailA = GreenTrivia.fromText(SyntaxKind.WhitespaceTrivia, '   ');
    const wsTrailB = GreenTrivia.fromText(SyntaxKind.WhitespaceTrivia, '  ');
    const greenRoot = GreenNode.create(SyntaxKind.CompilationUnit, [tokA, tokB]);
    // Green offsets: tokA at 0 (width 1), tokB at 1 (width 1)
    const triviaMap = new Map([
      [0, { leading: [wsLead], trailing: [wsTrailA], spelling: undefined }],
      [1, { leading: [], trailing: [wsTrailB], spelling: undefined }],
    ]);
    const tree = createSyntaxTree('src:test' as any, greenRoot, sourceText.length, triviaMap);
    expect(printCST(tree)).toBe(sourceText);
  });

  it('printCST with empty trivia map produces token text only', () => {
    const tokA = GreenToken.fromText(SyntaxKind.Identifier, 'x');
    const greenRoot = GreenNode.create(SyntaxKind.CompilationUnit, [tokA]);
    const tree = createSyntaxTree('src:test' as any, greenRoot, 1, new Map());
    expect(printCST(tree)).toBe('x');
  });

  it('printCST with nested nodes and trivia is lossless', () => {
    // Source: 'a = b'
    // Green children: [innerExpr(tokA, width=1), tokEq(width=1), tokB(width=1)]
    // Green offsets: innerExpr at 0, tokEq at 1, tokB at 2
    // Lexer trivia ownership: spaces between same-line tokens are trailing
    const sourceText = 'a = b';
    const tokA = GreenToken.fromText(SyntaxKind.Identifier, 'a');
    const tokEq = GreenToken.fromText(SyntaxKind.Assign, '=');
    const tokB = GreenToken.fromText(SyntaxKind.Identifier, 'b');
    const ws1 = GreenTrivia.fromText(SyntaxKind.WhitespaceTrivia, ' ');
    const ws2 = GreenTrivia.fromText(SyntaxKind.WhitespaceTrivia, ' ');
    const innerExpr = GreenNode.create(SyntaxKind.Expression, [tokA]);
    const greenRoot = GreenNode.create(SyntaxKind.CompilationUnit, [innerExpr, tokEq, tokB]);
    const triviaMap = new Map([
      [0, { leading: [], trailing: [ws1], spelling: undefined }],  // tokA: trailing ' '
      [1, { leading: [], trailing: [ws2], spelling: undefined }],  // tokEq: trailing ' '
      [2, { leading: [], trailing: [], spelling: undefined }],      // tokB: no trivia
    ]);
    const tree = createSyntaxTree('src:test' as any, greenRoot, sourceText.length, triviaMap);
    expect(printCST(tree)).toBe(sourceText);
  });
});

describe('§8.4 SyntaxKindClassification', () => {
  it('classifies tokens as TOKEN', () => {
    expect(classify(SyntaxKind.Identifier)).toBe(SyntaxKindClassification.TOKEN);
    expect(isTokenKind(SyntaxKind.IntegerLiteral)).toBe(true);
    expect(isTokenKind(SyntaxKind.KeywordSeed)).toBe(true);
    expect(isTokenKind(SyntaxKind.LeftBrace)).toBe(true);
  });

  it('classifies trivia as TRIVIA', () => {
    expect(classify(SyntaxKind.WhitespaceTrivia)).toBe(SyntaxKindClassification.TRIVIA);
    expect(isTriviaKind(SyntaxKind.LineCommentTrivia)).toBe(true);
    expect(isTriviaKind(SyntaxKind.BlockCommentTrivia)).toBe(true);
  });

  it('classifies structural nodes as CST_NODE', () => {
    expect(classify(SyntaxKind.CompilationUnit)).toBe(SyntaxKindClassification.CST_NODE);
    expect(isCstNodeKind(SyntaxKind.SeedDeclaration)).toBe(true);
    expect(isCstNodeKind(SyntaxKind.GeneDeclaration)).toBe(true);
    expect(isCstNodeKind(SyntaxKind.Expression)).toBe(true);
  });

  it('classifies recovery kinds', () => {
    expect(classify(SyntaxKind.Unknown)).toBe(SyntaxKindClassification.RECOVERY);
    expect(classify(SyntaxKind.Invalid)).toBe(SyntaxKindClassification.RECOVERY);
    expect(isRecoveryKind(SyntaxKind.Invalid)).toBe(true);
  });

  it('spot-checks representative kinds across all ranges', () => {
    const kinds = [
      SyntaxKind.Unknown, SyntaxKind.EndOfFile, SyntaxKind.Invalid,
      SyntaxKind.Identifier, SyntaxKind.PathLiteral,
      SyntaxKind.KeywordSeed, SyntaxKind.KeywordReadOnly,
      SyntaxKind.LeftBrace, SyntaxKind.Semicolon,
      SyntaxKind.Assign, SyntaxKind.In,
      SyntaxKind.WhitespaceTrivia, SyntaxKind.ByteOrderMarkTrivia,
      SyntaxKind.CompilationUnit, SyntaxKind.Block,
    ];
    for (const k of kinds) {
      const c = classify(k);
      expect(c).toBeDefined();
    }
  });
});
