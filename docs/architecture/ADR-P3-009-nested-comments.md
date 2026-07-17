# ADR-P3-009: Nested Comments

**Status**: ACCEPTED | **Prompt 3 §9**

## Context
Block comments need a consistent policy for nesting depth.

## Decision
Nested block comments are enabled with bounded depth (`maxCommentNestingDepth`, default 32). Exceeding the limit emits GSPL-LEX-COMMENT-NESTING-OVERFLOW and the comment is treated as terminated at the outermost level.

## Consequences
- Comment nesting is deterministic
- Bounded resource consumption
- No unbounded recursion on hostile input
