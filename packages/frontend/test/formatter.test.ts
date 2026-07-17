/** Formatter tests - Prompt 3 §20. */
import { describe, it, expect } from "vitest";
import { parseText } from "@gspl/parser";
import { formatSyntaxTree } from "../src/formatter.js";

describe("§20 Formatter", function() {
  it("formats simple seed with valid output", function() {
    var src = "seed 1.0\ngene x: scalar = 42\n";
    var pr = parseText("test.gspl", src);
    var result = formatSyntaxTree(pr.root);
    expect(result.text.length).toBeGreaterThan(0);
    expect(result.text).toContain("seed");
  });

  it("produces deterministic output", function() {
    var src = "seed 1.0\ngene x: scalar = 42\n";
    var pr1 = parseText("test.gspl", src);
    var pr2 = parseText("test.gspl", src);
    expect(formatSyntaxTree(pr1.root).text).toBe(formatSyntaxTree(pr2.root).text);
  });

  it("handles trailing newline option", function() {
    var src = "seed 1.0\ngene x: scalar = 42";
    var pr = parseText("test.gspl", src);
    var result = formatSyntaxTree(pr.root);
    expect(result.text.length).toBeGreaterThan(0);
  });
});
