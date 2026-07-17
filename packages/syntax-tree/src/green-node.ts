/**
 * GreenNode -- immutable, parentless, width-aware structural node.
 * Prompt 3 §8.1.
 *
 * Green nodes compose the lossless CST. They are position-independent:
 * no absolute offsets are stored. Width is the sum of child widths in
 * UTF-16 code units. A stable hash is computed over the canonical
 * serialization of (kind || flags || child hashes) so structurally
 * identical trees produce identical hashes across processes.
 */
import { SyntaxKind } from './syntax-kind.js';
import { GreenToken, stableHashFor } from './green-token.js';
import { createHash } from 'node:crypto';

/** Bit flags for green nodes. */
export const enum SyntaxFlags {
  None = 0,
  /** Synthesized by the parser to fill a missing required token. Width=0. */
  IsMissing = 1 << 0,
  /** Contains tokens the parser skipped during recovery. */
  ContainsSkipped = 1 << 1,
  /** Contains at least one diagnostic-grade recovery node. */
  ContainsDiagnostics = 1 << 2,
}

/** A green child is either a structural node or a terminal token. */
export type GreenChild = GreenNode | GreenToken;

/** Type guard. */
export function isGreenNode(child: GreenChild): child is GreenNode {
  return child instanceof GreenNode;
}
export function isGreenToken(child: GreenChild): child is GreenToken {
  return child instanceof GreenToken;
}

export interface GreenNodeData {
  readonly kind: SyntaxKind;
  readonly children: readonly GreenChild[];
  readonly flags: SyntaxFlags;
}

export class GreenNode {
  readonly kind: SyntaxKind;
  readonly children: readonly GreenChild[];
  readonly flags: SyntaxFlags;
  readonly fullWidth: number;
  readonly stableHash: string;

  constructor(data: GreenNodeData) {
    this.kind = data.kind;
    this.children = Object.freeze([...data.children]) as readonly GreenChild[];
    this.flags = data.flags;
    let w = 0;
    for (const c of this.children) {
      w += isGreenNode(c) ? c.fullWidth : c.width;
    }
    this.fullWidth = w;
    this.stableHash = computeGreenNodeHash(data.kind, data.flags, this.children);
    Object.freeze(this);
  }

  static create(kind: SyntaxKind, children: readonly GreenChild[], flags: SyntaxFlags = SyntaxFlags.None): GreenNode {
    return new GreenNode({ kind, children, flags });
  }

  get childCount(): number { return this.children.length; }
}

function computeGreenNodeHash(kind: SyntaxKind, flags: SyntaxFlags, children: readonly GreenChild[]): string {
  const h = createHash('sha256');
  h.update('node\0');
  h.update(String(kind));
  h.update('\0');
  h.update(String(flags));
  h.update('\0');
  for (const c of children) {
    if (isGreenNode(c)) {
      h.update('n:');
      h.update(c.stableHash);
    } else {
      h.update('t:');
      h.update(c.stableHash);
    }
    h.update(';');
  }
  return h.digest('hex');
}

/**
 * Mutable builder for constructing green nodes during parsing.
 * Finalize produces an immutable GreenNode. Prompt 3 §8.1 + §9.1.
 */
export class GreenNodeBuilder {
  private readonly _kind: SyntaxKind;
  private readonly _children: GreenChild[] = [];
  private _flags: SyntaxFlags = SyntaxFlags.None;

  constructor(kind: SyntaxKind) {
    this._kind = kind;
  }

  get kind(): SyntaxKind { return this._kind; }
  get childCount(): number { return this._children.length; }

  addChild(child: GreenChild): this {
    this._children.push(child);
    return this;
  }

  addToken(kind: SyntaxKind, text: string): this {
    this._children.push(GreenToken.fromText(kind, text));
    return this;
  }

  setMissing(): this {
    this._flags |= SyntaxFlags.IsMissing;
    return this;
  }

  setContainsSkipped(): this {
    this._flags |= SyntaxFlags.ContainsSkipped;
    return this;
  }

  setContainsDiagnostics(): this {
    this._flags |= SyntaxFlags.ContainsDiagnostics;
    return this;
  }

  finalize(): GreenNode {
    return new GreenNode({ kind: this._kind, children: this._children, flags: this._flags });
  }
}
