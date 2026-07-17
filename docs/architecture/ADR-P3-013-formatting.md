# ADR-P3-013: Formatting

**Status**: ACCEPTED | **Prompt 3 §20**

## Context
The formatter must be lossless, deterministic, idempotent, and comment-preserving.

## Decision
Format over the lossless red CST with trivia-preserving walk. Structural indentation via depth tracking (openers/closers). Declaration separation via blank lines. Newline normalization per policy. `changed` detection via normalized comparison with original reconstruction.

## Alternatives
- AST-based formatting: rejected because AST discards trivia
- Regex-based formatting: rejected for loss of structure

## Consequences
- `format(format(x)) === format(x)` holds
- All comments and documentation survive
- Malformed source is preserved
- Declaration separation improves readability
