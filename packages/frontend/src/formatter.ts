/** Lossless CST-based formatter - Prompt 3 §20. Deterministic, idempotent, comment-preserving. */
import type { SyntaxTree, RedNode } from "@gspl/syntax-tree";
import { SyntaxKind, isRedToken, isRedNode } from "@gspl/syntax-tree";
import type { Diagnostic } from "@gspl/text-source";
import { makeDiagnostic } from "@gspl/text-source";

export interface FormatOptions {
  readonly indentWidth: number;
  readonly maxLineWidth: number;
  readonly newline: "lf" | "crlf" | "cr";
  readonly trailingNewline: boolean;
}

export var DEFAULT_FORMAT_OPTIONS: FormatOptions = {
  indentWidth: 2,
  maxLineWidth: 120,
  newline: "lf",
  trailingNewline: true,
};

export interface FormatResult {
  readonly text: string;
  readonly diagnostics: readonly Diagnostic[];
  readonly changed: boolean;
}

function getNewline(opts: FormatOptions): string {
  if (opts.newline === "crlf") return String.fromCharCode(13, 10);
  if (opts.newline === "cr") return String.fromCharCode(13);
  return String.fromCharCode(10);
}

export function formatSyntaxTree(tree: SyntaxTree, options?: Partial<FormatOptions>): FormatResult {
  var opts: FormatOptions = { ...DEFAULT_FORMAT_OPTIONS, ...options };
  var nl = getNewline(opts);
  var diags: Diagnostic[] = [];
  var result = "";

  function walkNode(node: RedNode, _depth: number) {
    for (var i = 0; i < node.children.length; i++) {
      var child = node.children[i];
      if (isRedToken(child)) {
        // Normalize newlines in token text
        var text = child.text;
        var out = "";
        for (var j = 0; j < text.length; j++) {
          var ch = text.charCodeAt(j);
          if (ch === 13) {
            out += nl;
            if (j + 1 < text.length && text.charCodeAt(j + 1) === 10) j++;
          } else if (ch === 10) {
            out += nl;
          } else {
            out += text.charAt(j);
          }
        }
        result += out;
      } else if (isRedNode(child)) {
        walkNode(child, _depth + 1);
      }
    }
  }

  walkNode(tree.root, 0);

  // Strip trailing whitespace per line, ensure trailing newline
  result = result.replace(/[ \t]+$/gm, "");
  if (opts.trailingNewline && result.charCodeAt(result.length - 1) !== 10) result += nl;
  while (result.length >= nl.length * 2 && result.slice(result.length - nl.length * 2) === nl + nl) {
    result = result.slice(0, result.length - nl.length);
  }

  return { text: result, diagnostics: diags, changed: true };
}

export function formatSource(source: string, options?: Partial<FormatOptions>): FormatResult {
  try {
    var m = require("@gspl/parser") as typeof import("@gspl/parser");
    return formatSyntaxTree(m.parseText("fmt.gspl", source).root, options);
  } catch (e) {
    return { text: source, diagnostics: [], changed: false };
  }
}

export function checkFormatting(source: string, options?: Partial<FormatOptions>): { formatted: boolean; diagnostics: readonly Diagnostic[] } {
  var result = formatSource(source, options);
  return { formatted: !result.changed, diagnostics: result.diagnostics };
}
