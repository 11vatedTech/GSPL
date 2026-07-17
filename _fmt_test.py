import os
content = """/** Formatter tests - Prompt 3 20. */
import { describe, it, expect } from vitest;
import { parseText } from @gspl/parser;
import { formatSyntaxTree } from ../src/formatter.js;

describe(20 Formatter, function() {
  it(formats simple seed, function() {
    var src = seed 1.0
gene x: scalar = 42
;
    var pr = parseText(test.gspl, src);
    var result = formatSyntaxTree(pr.root);
    expect(result.text.length).toBeGreaterThan(0);
  });

  it(is idempotent, function() {
    var src = seed 1.0
gene x: scalar = 42
;
    var pr = parseText(test.gspl, src);
    var r1 = formatSyntaxTree(pr.root);
    var pr2 = parseText(test.gspl, r1.text);
    var r2 = formatSyntaxTree(pr2.root);
    expect(r2.text).toBe(r1.text);
  });

  it(preserves comments, function() {
    var src = seed 1.0
  // a comment
  gene x: scalar = 42
;
    var pr = parseText(test.gspl, src);
    var result = formatSyntaxTree(pr.root);
    expect(result.text).toContain(// a comment);
  });

  it(produces deterministic output, function() {
    var src = seed 1.0
gene x: scalar = 42
;
    var pr1 = parseText(test.gspl, src);
    var pr2 = parseText(test.gspl, src);
    expect(formatSyntaxTree(pr1.root).text).toBe(formatSyntaxTree(pr2.root).text);
  });
});
"""
with open(packages/frontend/test/formatter.test.ts, w, encoding=utf-8, newline=) as f:
    f.write(content)
print(OK)
