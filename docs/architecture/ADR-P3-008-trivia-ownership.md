# ADR-P3-008: Trivia Ownership

**Status**: ACCEPTED | **Prompt 3 § trivia**

## Context
Every source code unit must have exactly one owner. Same-line EOF trivia must trail the preceding token. Post-newline trivia must lead the next token or EOF.

## Decision
Two-phase token finalization: mutable builders collect trivia during lexing; immutable tokens are published after all ownership is settled. Block comments with line terminators are leading trivia for the following token. Same-line block comments are trailing trivia.

## Consequences
- Lossless reconstruction is exact
- Every code unit belongs to exactly one token
- No shared mutable trivia arrays in public API
