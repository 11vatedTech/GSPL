/**
 * Token stream invariant validation. Prompt 3 Sections 21 + 8.
 *
 * Two layers (Prompt 3 Integrity Repair §8):
 *   1. Reconstruction check (`validateTokenStream`) — concatenates token
 *      lexemes and trivia in order and compares to source.text.
 *   2. Property-level ownership check (`validateOwnership`) — walks the
 *      source via a `cursor` index, verifies every token/trivia claims
 *      exactly the source bytes it claims (using `width` codes), and that
 *      the cursor lands exactly on `source.length` at EOF.
 *
 * Both layers are independent. A program that reconstructs correctly by
 * coincidence can still fail property-level checks. GreenTrivia only
 * exposes `kind` / `text` / `width` and GreenToken the same, so we use
 * `width` codes rather than source-byte offsets (which the trivia type
 * does not carry) to track position.
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

/**
 * Property-level ownership validator (Prompt 3 Integrity Repair §8).
 * Uses a cursor walk through the source. Independent from string
 * reconstruction. Verifies:
 *   - every trivia/lexeme claims the bytes it claims, in order;
 *   - cursor hits `source.length` exactly at EOF;
 *   - exactly one EOF token emitted, on the last position;
 *   - all trivia spans stay within source bounds.
 */
export function validateOwnership(source: SourceDocument, tokens: readonly Token[]): TokenStreamValidationResult {
  const errors: string[] = [];
  if (tokens.length === 0) {
    errors.push('no tokens emitted (expected at least one EOF)');
    return { ok: false, errors };
  }

  let cursor = 0;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    for (const tr of t.leadingTrivia) {
      const w = triviaWidth(tr);
      if (w < 0 || cursor + w > source.length) {
        errors.push('token[' + i + '].leadingTrivia out of bounds at cursor ' + cursor + ' (width=' + w + ')');
        cursor = source.length;
        break;
      }
      const slice = source.text.slice(cursor, cursor + w);
      if (slice !== tr.text) {
        errors.push('token[' + i + '].leadingTrivia mismatch at cursor ' + cursor + ' (expected ' + JSON.stringify(slice) + ', got ' + JSON.stringify(tr.text) + ')');
      }
      cursor += w;
    }
    const lexW = tokenLexemeWidth(t);
    if (lexW < 0 || cursor + lexW > source.length) {
      errors.push('token[' + i + '].lexeme out of bounds at cursor ' + cursor + ' (lexemeWidth=' + lexW + ')');
      cursor = source.length;
      continue;
    }
    const lexSlice = source.text.slice(cursor, cursor + lexW);
    if (lexSlice !== t.greenToken.text) {
      errors.push('token[' + i + '].lexeme mismatch at cursor ' + cursor + ' (expected ' + JSON.stringify(lexSlice) + ', got ' + JSON.stringify(t.greenToken.text) + ')');
    }
    cursor += lexW;
    for (const tr of t.trailingTrivia) {
      const w = triviaWidth(tr);
      if (w < 0 || cursor + w > source.length) {
        errors.push('token[' + i + '].trailingTrivia out of bounds at cursor ' + cursor + ' (width=' + w + ')');
        cursor = source.length;
        break;
      }
      const slice = source.text.slice(cursor, cursor + w);
      if (slice !== tr.text) {
        errors.push('token[' + i + '].trailingTrivia mismatch at cursor ' + cursor + ' (expected ' + JSON.stringify(slice) + ', got ' + JSON.stringify(tr.text) + ')');
      }
      cursor += w;
    }
  }

  if (cursor !== source.length) {
    errors.push('cursor ' + cursor + ' does not match source length ' + source.length);
  }

  const eofs = tokens.filter((t) => t.greenToken.kind === SyntaxKind.EndOfFile);
  if (eofs.length !== 1) {
    errors.push('expected exactly one EOF token, got ' + eofs.length);
  }

  return { ok: errors.length === 0, errors };
}

function triviaWidth(tr: { readonly text: string; readonly width: number; readonly kind: unknown }): number {
  if (typeof tr.width === 'number' && tr.width >= 0) return tr.width;
  return tr.text.length;
}

function tokenLexemeWidth(t: Token): number {
  const w = (t.greenToken as unknown as { width?: number }).width;
  if (typeof w === 'number' && w >= 0) return w;
  return t.greenToken.text.length;
}
