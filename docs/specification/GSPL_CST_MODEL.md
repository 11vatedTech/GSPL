# GSPL CST Model

**Version**: gspl-text/1.0 | **Status**: Implemented | **Prompt 3 §8**

## Architecture

Green tree: immutable, parentless, width-aware, shareable, hashable, independent of absolute position. Green tokens carry trivia separately.

Red tree: parent relationships, absolute offsets, typed accessors, source spans, trivia map. Lazy child materialization.

## Losslessness

```text
printCST(parse(source)) = source
```

The CST preserves exact token spelling, whitespace, newline forms, comments, documentation comments, malformed tokens, missing-token positions, skipped text, and source ordering.

## Syntax Kinds

Every kind is classified as TOKEN, TRIVIA, CST NODE, AST-LOWERABLE, CST-ONLY, RECOVERY, or PARSER-ONLY.
