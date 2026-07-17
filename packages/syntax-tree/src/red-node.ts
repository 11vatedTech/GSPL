/**
 * RedNode -- parent-linked, absolute-offset CST node for navigation.
 * Prompt 3 §8.2.
 *
 * Red nodes wrap immutable green nodes and compute absolute source spans
 * by accumulating parent offsets at materialization time. No global
 * mutable state: caches are per-tree and use plain field assignment on
 * frozen instances (not WeakMaps or process-wide registries).
 */
import { SyntaxKind } from './syntax-kind.js';
import { GreenToken } from './green-token.js';
import { GreenNode, GreenChild, isGreenNode, isGreenToken, SyntaxFlags } from './green-node.js';
import type { GreenTrivia } from './trivia.js';
import type { SourceSpan, SourceId } from '@gspl/text-source';

/**
 * Trivia map -- maps a green token's GREEN-TREE-LOCAL offset (the
 * accumulated width of green children from the root, NOT the source
 * offset) to its leading and trailing trivia arrays.
 *
 * The parser builds this from the lexer Token[] by iterating tokens
 * and keying by the running sum of green token widths:
 *   let greenOffset = 0;
 *   for (const token of lexResult.tokens) {
 *     triviaMap.set(greenOffset, { leading, trailing, spelling });
 *     greenOffset += token.greenToken.width;
 *   }
 *
 * computeChildren uses the same green-offset accumulation, so the
 * lookup aligns. This is the critical bridge that makes printCST
 * lossless: trivia lives on the lexer Token, not in the green tree.
 */
export interface TriviaEntry {
  readonly leading: readonly GreenTrivia[];
  readonly trailing: readonly GreenTrivia[];
  readonly spelling?: string;
}

export type TriviaMap = ReadonlyMap<number, TriviaEntry>;

/** Red child — mirrors green child but carries absolute offset. */
export type RedChild = RedNode | RedToken;

export interface RedTokenData {
  readonly green: GreenToken;
  readonly span: SourceSpan;
  readonly leadingTrivia: readonly GreenTrivia[];
  readonly trailingTrivia: readonly GreenTrivia[];
  readonly spelling?: string;
}

/** Red token — a leaf carrying its absolute span and trivia. */
export class RedToken {
  readonly green: GreenToken;
  readonly span: SourceSpan;
  readonly leadingTrivia: readonly GreenTrivia[];
  readonly trailingTrivia: readonly GreenTrivia[];
  readonly spelling: string | undefined;

  constructor(data: RedTokenData) {
    this.green = data.green;
    this.span = data.span;
    this.leadingTrivia = data.leadingTrivia;
    this.trailingTrivia = data.trailingTrivia;
    this.spelling = data.spelling;
    Object.freeze(this);
  }

  get kind(): SyntaxKind { return this.green.kind; }
  get text(): string { return this.green.text; }
  get width(): number { return this.green.width; }
  get isMissing(): boolean { return false; }
}

export interface RedNodeData {
  readonly green: GreenNode;
  readonly span: SourceSpan;
  readonly parent: RedNode | null;
}

/** Red node — structural node with parent link and absolute span. */
export class RedNode {
  readonly green: GreenNode;
  readonly span: SourceSpan;
  readonly parent: RedNode | null;
  private readonly _triviaMap: TriviaMap;
  private _children: RedChild[] | null = null;

  constructor(data: RedNodeData, triviaMap?: TriviaMap) {
    this.green = data.green;
    this.span = data.span;
    this.parent = data.parent;
    this._triviaMap = triviaMap ?? new Map();
  }

  get kind(): SyntaxKind { return this.green.kind; }
  get flags(): SyntaxFlags { return this.green.flags; }
  get isMissing(): boolean { return (this.green.flags & SyntaxFlags.IsMissing) !== 0; }
  get childCount(): number { return this.green.childCount; }

  /** Lazily materialized children with absolute offsets. */
  get children(): readonly RedChild[] {
    if (this._children === null) {
      this._children = computeChildren(this, this._triviaMap);
    }
    return this._children;
  }

  get firstChild(): RedChild | undefined { return this.children[0]; }
  get lastChild(): RedChild | undefined { return this.children[this.childCount - 1]; }

  /** Walk ancestors. */  get ancestors(): IterableIterator<RedNode> {
    return makeAncestorIterator(this);
  }

  childAt(index: number): RedChild | undefined {
    return this.children[index];
  }
}

function* makeAncestorIterator(node: RedNode): IterableIterator<RedNode> {
  let cur: RedNode | null = node.parent;
  while (cur !== null) {
    yield cur;
    cur = cur.parent;
  }
}

/**
 * Compute red children from green children by accumulating widths.
 * Token trivia is supplied via the parallel trivia arrays.
 */
function computeChildren(parent: RedNode, tm: TriviaMap): RedChild[] {
  const greens = parent.green.children;
  const result: RedChild[] = [];
  let offset = parent.span.start;
  const sourceId = parent.span.sourceId;
  for (const gc of greens) {
    if (isGreenNode(gc)) {
      const span: SourceSpan = { sourceId, start: offset, end: offset + gc.fullWidth };
      result.push(new RedNode({ green: gc, span, parent }, tm));
      offset += gc.fullWidth;
    } else {
      const span: SourceSpan = { sourceId, start: offset, end: offset + gc.width };
      const tr = tm.get(offset);
      result.push(new RedToken({
        green: gc,
        span,
        leadingTrivia: tr?.leading ?? [],
        trailingTrivia: tr?.trailing ?? [],
        spelling: tr?.spelling,
      }));
      offset += gc.width;
    }
  }
  return result;
}

/** Type guards. */
export function isRedNode(child: RedChild): child is RedNode {
  return child instanceof RedNode;
}
export function isRedToken(child: RedChild): child is RedToken {
  return child instanceof RedToken;
}

/**
 * SyntaxTree -- the root of a parsed compilation unit.
 * Pins the source identity and the root red node.
 * Prompt 3 §8.2.
 */
export interface SyntaxTree {
  readonly sourceId: SourceId;
  readonly root: RedNode;
  readonly sourceLength: number;
  /** Trivia map keyed by token start offset. May be empty. */
  readonly triviaMap: TriviaMap;
}

export function createSyntaxTree(
  sourceId: SourceId,
  rootGreen: GreenNode,
  sourceLength: number,
  triviaMap: TriviaMap = new Map(),
): SyntaxTree {
  const root = new RedNode({
    green: rootGreen,
    span: { sourceId, start: 0, end: sourceLength },
    parent: null,
  },
  triviaMap);
  return { sourceId, root, sourceLength, triviaMap };
}
