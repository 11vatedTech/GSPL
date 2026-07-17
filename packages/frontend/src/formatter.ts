/** Lossless CST-based formatter - Prompt 3 §20. Trivia-preserving, idempotent. */
import { isRedToken, isRedNode, printRedToken, type SyntaxTree, type RedNode } from "@gspl/syntax-tree";
import type { Diagnostic } from "@gspl/text-source";
import { makeDiagnostic } from "@gspl/text-source";
import { parseText, type ParseResult } from "@gspl/parser";

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

var NEWLINE_BY_POLICY: Record<string, string> = {
  lf: "\n",
  crlf: "\r\n",
  cr: "\r",
};

function normalizeNewlines(text: string, nl: string): string {
  var out = "";
  for (var i = 0; i < text.length; i++) {
    var ch = text.charCodeAt(i);
    if (ch === 13) {
      out += nl;
      if (i + 1 < text.length && text.charCodeAt(i + 1) === 10) i++;
    } else if (ch === 10) {
      out += nl;
    } else {
      out += text.charAt(i);
    }
  }
  return out;
}

/** Walk the red tree emitting trivia + token text with normalized newlines.
 *  Applies structural indentation based on nesting depth. */
export function formatSyntaxTree(tree: SyntaxTree, options?: Partial<FormatOptions>): FormatResult {
  var opts: FormatOptions = { ...DEFAULT_FORMAT_OPTIONS, ...options };
  var nl = NEWLINE_BY_POLICY[opts.newline] || "\n";
  var diags: Diagnostic[] = [];
  var result = "";
  var indentStr = " ".repeat(opts.indentWidth);
  var currentDepth = 0;
  var pendingIndent = false;

  // Token kinds that increase indentation after themselves
  var OPENERS: Record<number, boolean> = {};
  OPENERS[91/*[*/] = true; OPENERS[123/*{*/] = true; OPENERS[40/*(*/] = true;
  var CLOSERS: Record<number, boolean> = {};
  CLOSERS[93/*]*/] = true; CLOSERS[125/*}*/] = true; CLOSERS[41/*)*/] = true;

  function emit(s: string): void {
    if (pendingIndent && s.length > 0 && s.charCodeAt(0) !== 10 && s.charCodeAt(0) !== 13) {
      result += indentStr.repeat(currentDepth);
      pendingIndent = false;
    }
    result += s;
  }

  // Track top-level declaration boundaries for blank-line insertion
  var isTopLevel = true;

  function walkNode(node: RedNode): void {
    var wasTop = isTopLevel;
    if (isTopLevel) isTopLevel = false;
    var prevDepth = currentDepth;

    for (var i = 0; i < node.children.length; i++) {
      var child = node.children[i];
      if (isRedToken(child)) {
        // Emit leading trivia with indentation after newlines
        for (var j = 0; j < child.leadingTrivia.length; j++) {
          var lt = normalizeNewlines(child.leadingTrivia[j].text, nl);
          emit(lt);
          if (lt.indexOf(nl) >= 0) pendingIndent = true;
        }
        var tokText = child.text;
        // Closers: decrease depth BEFORE emitting so they align with openers
        if (tokText.length === 1 && CLOSERS[tokText.charCodeAt(0)]) {
          if (currentDepth > 0) currentDepth--;
          if (pendingIndent) pendingIndent = false;
        }
        // Emit token text
        emit(normalizeNewlines(tokText, nl));
        // Openers: increase depth AFTER emitting (next line indented more)
        if (tokText.length === 1 && OPENERS[tokText.charCodeAt(0)]) {
          currentDepth++;
        }
        // Emit trailing trivia (preserves original spacing)
        for (var k = 0; k < child.trailingTrivia.length; k++) {
          var tt = normalizeNewlines(child.trailingTrivia[k].text, nl);
          emit(tt);
          if (tt.indexOf(nl) >= 0) pendingIndent = true;
        }
      } else if (isRedNode(child)) {
        // Check if this is a top-level declaration node
        if (wasTop && result.length > 0 && pendingIndent) {
          emit(nl); // blank line before declaration
        }
        walkNode(child);
      }
    }
    currentDepth = prevDepth;
  }

  walkNode(tree.root);

  // Ensure trailing newline
  if (opts.trailingNewline && result.length > 0 && result.charCodeAt(result.length - 1) !== 10) {
    result += nl;
  }

  // Remove trailing blank lines (keep at most one trailing newline)
  var nlLen = nl.length;
  while (result.length >= nlLen * 2 && result.slice(-nlLen * 2) === nl + nl) {
    result = result.slice(0, result.length - nlLen);
  }

  // Compare with source to determine changed: normalize both sides identically
  // Strip trailing newlines on both before comparison
  var original = "";
  for (var i2 = 0; i2 < tree.root.children.length; i2++) {
    var c = tree.root.children[i2];
    if (isRedToken(c)) original += printRedToken(c);
    else if (isRedNode(c)) original += printRedTokenRecursive(c);
  }
  // Apply same newline normalization and trailing-newline policy to both
  var normOrig = normalizeNewlines(original, nl);
  var normResult = normalizeNewlines(result, nl);
  // Strip trailing newlines on both sides for fair comparison
  while (normOrig.length >= nlLen && normOrig.slice(-nlLen) === nl) normOrig = normOrig.slice(0, -nlLen);
  while (normResult.length >= nlLen && normResult.slice(-nlLen) === nl) normResult = normResult.slice(0, -nlLen);
  // Strip trailing whitespace per line (both sides)
  var changed = normOrig.replace(/[ \t]+$/gm, "") !==
                normResult.replace(/[ \t]+$/gm, "");

  return { text: result, diagnostics: diags, changed: changed };
}

function printRedTokenRecursive(node: RedNode): string {
  var out = "";
  for (var i = 0; i < node.children.length; i++) {
    var child = node.children[i];
    if (isRedToken(child)) out += printRedToken(child);
    else if (isRedNode(child)) out += printRedTokenRecursive(child);
  }
  return out;
}

export function formatSource(source: string, options?: Partial<FormatOptions>): FormatResult {
  var diags: Diagnostic[] = [];
  try {
    var parseResult: ParseResult = parseText("fmt.gspl", source);
    var fmtResult = formatSyntaxTree(parseResult.root, options);
    // Merge parser diagnostics with formatter diagnostics
    diags = [...parseResult.diagnostics, ...fmtResult.diagnostics];
    return { text: fmtResult.text, diagnostics: diags, changed: fmtResult.changed };
  } catch (e: any) {
    diags.push(makeDiagnostic({
      code: "GSPL-FORMAT-PARSE-ERROR",
      message: "format: parse failed: " + (e.message || String(e)),
      severity: "error",
      span: { sourceId: "fmt:error" as any, start: 0, end: 0 },
      category: "format",
      phase: "format",
      canonical: true,
    }));
    return { text: source, diagnostics: diags, changed: false };
  }
}

export function checkFormatting(source: string, options?: Partial<FormatOptions>): { formatted: boolean; diagnostics: readonly Diagnostic[] } {
  var result = formatSource(source, options);
  return { formatted: !result.changed, diagnostics: result.diagnostics };
}
