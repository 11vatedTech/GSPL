/**
 * Trivia — immutable trivia nodes. Prompt 3 §14.
 */
import { SyntaxKind } from './syntax-kind.js';

export interface GreenTriviaData {
  readonly kind: SyntaxKind;
  readonly text: string;
  readonly width: number;
}

export class GreenTrivia {
  readonly kind: SyntaxKind;
  readonly text: string;
  readonly width: number;

  constructor(data: GreenTriviaData) {
    this.kind = data.kind;
    this.text = data.text;
    this.width = data.width;
    Object.freeze(this);
  }

  static fromText(kind: SyntaxKind, text: string): GreenTrivia {
    return new GreenTrivia({ kind, text, width: text.length });
  }
}
