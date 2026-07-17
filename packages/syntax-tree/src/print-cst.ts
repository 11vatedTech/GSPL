/**
 * printCST -- lossless reconstruction of source text from a CST.
 * Prompt 3 §8.3.
 *
 * Law: printCST(parse(source)) === source.text  (modulo declared BOM policy).
 *
 * The printer walks the red tree depth-first, emitting for each RedToken:
 *   leadingTrivia.text + token.text + trailingTrivia.text
 * For RedNodes it recurses into children in order.
 *
 * Trivia is NOT stored in the green tree; it lives on the lexer Token
 * and is threaded through the red tree via RedToken fields. This avoids
 * trivia duplication between green and red layers.
 */
import { RedNode, RedToken, RedChild, isRedNode, isRedToken } from './red-node.js';
import type { SyntaxTree } from './red-node.js';
import { GreenTrivia } from './trivia.js';

/** Print a full syntax tree back to source text. */
export function printCST(tree: SyntaxTree): string {
  return printRedNode(tree.root);
}

/** Print a red node by concatenating its children. */
export function printRedNode(node: RedNode): string {
  let out = '';
  for (const child of node.children) {
    out += printRedChild(child);
  }
  return out;
}

/** Print a single red child (node or token). */
export function printRedChild(child: RedChild): string {
  if (isRedNode(child)) {
    return printRedNode(child);
  }
  return printRedToken(child);
}

/** Print a red token including its trivia. */
export function printRedToken(token: RedToken): string {
  let out = '';
  for (const tr of token.leadingTrivia) out += tr.text;
  out += token.text;
  for (const tr of token.trailingTrivia) out += tr.text;
  return out;
}

/** Print just the trivia arrays (for debugging / ownership checks). */
export function printTrivia(trivia: readonly GreenTrivia[]): string {
  let out = '';
  for (const tr of trivia) out += tr.text;
  return out;
}
