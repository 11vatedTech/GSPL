# ADR-P3-014: Lossless Green/Red CST Architecture

**Status:** ACCEPTED (Prompt 3 §8)

**Date:** 2026-07-17

**Related:** ADR-P3-007 (lexer architecture), ADR-P3-008 (trivia ownership), ADR-P3-013 (normative textual language)

## Context

Prompt 3 requires a lossless concrete syntax tree (CST) as the foundation
for the parser (§9), typed accessors (§10), AST lowering (§11), and
every downstream frontend phase. The CST must satisfy:

- `printCST(parse(source)) === source` under the declared BOM policy
- Preservation of exact token spelling, whitespace, newlines, comments,
  documentation comments, malformed tokens, missing-token positions,
  skipped text, and source ordering
- Immutable, parentless, width-aware, structurally hashable green nodes
- Parent-linked, absolute-offset red nodes with lazy child materialization
- No global mutable state in caches
- A governed SyntaxKind classification system

## Decision

Adopt a two-layer green/red tree architecture inspired by Roslyn, adapted
for the GSPL lexer's trivia-ownership model.

### Green tree (§8.1)

Green nodes are immutable, parentless, and position-independent. They store:
- `kind: SyntaxKind`
- `children: readonly GreenChild[]` (GreenNode | GreenToken)
- `fullWidth: number` (sum of child widths in UTF-16 code units)
- `stableHash: string` (SHA-256 of kind || flags || child hashes)
- `flags: SyntaxFlags` (IsMissing, ContainsSkipped, ContainsDiagnostics)

Children use a flat readonly array — simplest correct representation for
expected GSPL tree sizes (~10K-100K nodes per file). Slice/interning is
deferred unless profiling proves needed.

Missing tokens are represented as GreenNode with `IsMissing` flag and width=0.
Skipped tokens use `ContainsSkipped` flag. This avoids separate
MissingToken/SkippedToken node kinds.

### Trivia threading (§8.1 + §8.3)

Trivia is NOT stored in the green tree. The lexer already attaches
`leadingTrivia` and `trailingTrivia` arrays to each `Token` record
(Phase B finalization). The parser builds a `TriviaMap` keyed by
GREEN-TREE-LOCAL offset (accumulated green child width from root, NOT
source offset) mapping to `{ leading, trailing, spelling }` entries.

`computeChildren` in the red tree uses the same green-offset accumulation,
so the lookup aligns. `printCST` emits `leading + text + trailing` per
RedToken, achieving losslessness.

### Red tree (§8.2)

Red nodes wrap green nodes and compute absolute source spans by
accumulating parent offsets. Children are lazily materialized via
`computeChildren(parent, triviaMap)`. No global mutable state — caches
are per-instance private fields.

### SyntaxKind classification (§8.4)

Every SyntaxKind is classified into one of:
- `TOKEN` — terminal token
- `TRIVIA` — whitespace or comment trivia
- `CST_NODE` — structural node lowering to AST
- `AST_LOWERABLE` — syntactic sugar (reserved)
- `CST_ONLY` — passes through unchanged
- `RECOVERY` — synthesized for malformed source
- `PARSER_ONLY` — internal, never escapes to AST

### printCST (§8.3)

`printCST(tree)` walks the red tree depth-first, emitting per RedToken:
`leadingTrivia.text + token.text + trailingTrivia.text`. For RedNodes
it recurses into children in order. Missing tokens (width=0) contribute
no text.

## Alternatives considered

### Alt 1 — Trivia as green children (Roslyn-style)

Store GreenTrivia as GreenChild entries in the green tree. Pro: offsets
align naturally. Con: requires changing GreenChild union, more complex
tree construction, every node carries trivia children. Rejected for v1
because the lexer already owns trivia; the TriviaMap approach is simpler.

### Alt 2 — TriviaMap keyed by source offset

Key the TriviaMap by the lexer token's absolute source offset. Rejected
because `computeChildren` accumulates green-child widths, not source
offsets. Green-tree-local offset keying aligns naturally.

### Alt 3 — Slice/interning for child representation

Use a slice with offset/length over a shared backing array. Rejected for
v1 because flat readonly arrays are simpler and sufficient for expected
tree sizes. Profiling may revisit this.

## Consequences

### Positive
- Simple, correct, immutable green tree
- Lossless reconstruction verified by end-to-end tests
- Clear API for the parser: GreenNodeBuilder + createSyntaxTree + TriviaMap
- Stable hash enables structural sharing and deterministic identity
- SyntaxKind classification provides governed kind management

### Negative
- Every RedNode carries a reference to the full TriviaMap (memory)
- Root span.end (sourceLength) may exceed root.green.fullWidth (token text
  only) — trivia width is not in the green tree
- RedNode is not Object.freeze'd (fields are readonly but object isn't frozen)

## Security implications

- Green tree excludes absolute positions, preventing position-based attacks
- Stable hash uses SHA-256 over canonical serialization — no timing leaks
- No global mutable state — no cross-compilation interference

## Determinism implications

- Stable hash is deterministic across processes (kind + flags + child hashes)
- printCST output is deterministic given the same green tree + trivia map
- SyntaxKindClassification is a fixed table — no runtime variability

## Performance implications

- O(n) tree construction and printing
- Lazy child materialization avoids O(n^2) for deep traversal
- Flat array children: O(1) access, O(n) iteration
- TriviaMap lookup: O(1) per token

## Migration implications

- No pre-existing CST to migrate
- Future versions may add Slice/interning without API changes
- Future versions may move trivia into the green tree if needed

## Validation references

- `packages/syntax-tree/test/cst.test.ts` — 24 tests covering green/red/print/classification
- `packages/syntax-tree/src/index.ts` — public API surface
- `vitest.workspace.ts` — syntax-tree project entry
- `npm run test:syntax-tree` (via workspace) — runs all CST tests
