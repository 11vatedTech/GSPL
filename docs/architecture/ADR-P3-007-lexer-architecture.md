# ADR-P3-007: Lexer Architecture

**Status**: ACCEPTED | **Prompt 3 § lexer**

## Context
The lexer must produce lossless, deterministic token streams with exact trivia ownership.

## Decision
Two-phase architecture: mutable builders during lexing, immutable publication after trivia ownership settles. EOF trivia ownership follows the policy: same-line trivia trails the preceding token; post-newline trivia leads EOF.

## Alternatives
- Single-pass immutable tokens: rejected because trivia ownership across newlines isn't known until the next token
- Trivia as separate stream: rejected because lossless reconstruction requires exact interleaving

## Consequences
- Lossless reconstruction is proven
- Every code unit has exactly one owner
- No mutable state in public API
