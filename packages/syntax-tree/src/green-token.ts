/**
 * GreenToken — immutable, position-independent token node.
 * Prompt 3 §22.
 */
import { SyntaxKind } from './syntax-kind.js';

export interface GreenTokenData {
  readonly kind: SyntaxKind;
  readonly text: string;
  /** Lexeme-width in UTF-16 code units. */
  readonly width: number;
  /** Stable hash of (kind + text). */
  readonly stableHash: string;
  /** Original source text if this token was a lexeme replacement (e.g. integer -> bigint). */
  readonly originalText?: string;
  /** Whether this token carried leading/trailing trivia. */
  readonly hadLeadingTrivia?: boolean;
  readonly hadTrailingTrivia?: boolean;
}

export class GreenToken {
  readonly kind: SyntaxKind;
  readonly text: string;
  readonly width: number;
  readonly stableHash: string;
  readonly originalText: string | undefined;
  readonly hadLeadingTrivia: boolean;
  readonly hadTrailingTrivia: boolean;

  constructor(data: GreenTokenData) {
    this.kind = data.kind;
    this.text = data.text;
    this.width = data.width;
    this.stableHash = data.stableHash;
    this.originalText = data.originalText;
    this.hadLeadingTrivia = data.hadLeadingTrivia ?? false;
    this.hadTrailingTrivia = data.hadTrailingTrivia ?? false;
    Object.freeze(this);
  }

  static fromText(kind: SyntaxKind, text: string): GreenToken {
    const h = stableHashFor(kind, text);
    return new GreenToken({ kind, text, width: text.length, stableHash: h });
  }

  withTrivia(leading: boolean, trailing: boolean): GreenToken {
    return new GreenToken({
      kind: this.kind,
      text: this.text,
      width: this.width,
      stableHash: this.stableHash,
      originalText: this.originalText,
      hadLeadingTrivia: leading,
      hadTrailingTrivia: trailing,
    });
  }
}

import { createHash } from 'node:crypto';
export function stableHashFor(kind: SyntaxKind, text: string): string {
  return createHash('sha256').update('token\0').update(String(kind)).update('\0').update(text, 'utf8').digest('hex');
}
