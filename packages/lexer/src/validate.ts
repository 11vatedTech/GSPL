/**
 * Token stream invariant validation. Prompt 3 Section 21.
 */
import type { SourceDocument } from '@gspl/text-source';
import { SyntaxKind } from '@gspl/syntax-tree';
import type { Token } from './token.js';

export interface TokenStreamValidationResult {
  readonly ok: boolean;
  readonly errors: readonly string[];
}

export function validateTokenStream(source: SourceDocument, tokens: readonly Token[]): TokenStreamValidationResult {
  const errors: string[] = [];
  let expectedOffset = 0;
  let reconstructed = '';
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (t.span.start < expectedOffset && t.greenToken.kind !== SyntaxKind.EndOfFile) {
      errors.push('token at index ' + i + ' starts before expected offset ' + expectedOffset + ' (got ' + t.span.start + ')');
    }
    if (t.span.end > source.length && t.greenToken.kind !== SyntaxKind.EndOfFile) {
      errors.push('token at index ' + i + ' ends past source length (span.end=' + t.span.end + ', source.length=' + source.length + ', text=' + JSON.stringify(t.greenToken.text) + ')');
    }
    for (const tr of t.leadingTrivia) reconstructed += tr.text;
    reconstructed += t.greenToken.text;
    for (const tr of t.trailingTrivia) reconstructed += tr.text;
    if (t.greenToken.kind !== SyntaxKind.EndOfFile) {
      expectedOffset = Math.max(expectedOffset, t.span.end);
    }
  }
  if (tokens.length === 0 || tokens[tokens.length - 1]!.greenToken.kind !== SyntaxKind.EndOfFile) {
    errors.push('last token is not EndOfFile');
  }
  if (reconstructed !== source.text) {
    errors.push('reconstructed text does not equal source text (length ' + reconstructed.length + ' vs ' + source.length + ')');
  }
  return { ok: errors.length === 0, errors };
}
