# ADR-P3-013: Normative GSPL Textual Language

**Status:** ACCEPTED (Prompt 3 §6 architectural slice)

**Date:** 2026-07-17

**Deciders:** GSPL Canon foundation (script-disciplined)

**Supersedes:** none

**Related:** ADR-0002 (source-vs-seed), ADR-0006 (7-axis discipline), ADR-P3-001..012 (Prompt 3 lexer ADRs).

## Context

Prompt 3 requires a deterministic, lossless, secure textual language that authors can use to declare canonically valid GSPL seeds. Three constraints bind the design:

1. **Canonical surface.** Every textual form must lower deterministically into a `CanonicalSeed` per `seed-format/src/seed.ts` or a `PackageContract` per `seed-format/src/packages.ts`.
2. **Lossless CST.** The parser must preserve trivia, comments, and exact spelling such that `printCST(parse(source)) == source`.
3. **No new canonical primitives.** The textual language adds **no** primitive gene concept. New concepts enter via `gene-protocol/src/types.ts`, never via more keywords.

A naive textual language would re-derive keywords, invent ad-hoc expression types, and bake in extension points the canon already covers. That path was rejected.

## Decision

A `.gspl` source is a single document containing **at most one** `SeedDeclaration`, optional preamble-style `Module`/`Import`/`Export` clauses, and post-able SeedBody declarations.

### Decision 1 - keyword set

The textual language reuses **exactly** the keywords already declared in `packages/syntax-tree/src/syntax-kind.ts`. No new keyword is added in this slice. Keywords are referenced by literal lexeme in the textual-language spec; the contract JSON registry declares the mapping between lexeme and `SyntaxKind`.

### Decision 2 - six type forms

Type syntax is restricted to: NamedType, ListType, MapType, OptionalType, VariantType, RecordType. Tuple types are deliberately not in the v1 surface.

### Decision 3 - precedence table

A fixed precedence table ships with the language. There are no implicitness rules; the table is enumerable, machine-checkable, and referenced in `GSPL_GRAMMAR.contract.json` under `expressionPrecedence`.

### Decision 4 - diagnostics

Parser diagnostics are enumerable; each diagnostic code is registered in `GSPL_GRAMMAR.contract.json` under `diagnosticCodes` and has a defined severity, ordering rule, recovery action, and lowering interaction. Diagnostic codes are **not** the same namespace as the lexer (`GSPL-LEX-*`); they are `GSPL-PARSE-*` and `GSPL-MODULE-*`.

### Decision 5 - desugaring contract

Authoring sugar lowers **deterministically and canonically**.

* Variants sorted lexicographically.
* Effects flattened to `EffectPermissions` with `read_only` mapped to `filesystem: "read"`.
* Authored field order is discarded; canonical order from `seed.ts` is used.
* Non-author fields (`contentId`, `lineage.generation`, `provenance.author`, etc.) are derived during lowering, never authored.

### Decision 6 - version handling

Only `"1.0"` is accepted as a `VersionLiteral`. The textual language rejects wildcards and major-only versions in v1.

## Alternatives considered

### Alt 1 - Restrict to JSON

Treat `.gspl` as a JSON front-end. **Rejected** because round-trip losslessness is harder for hand-written sources (no trivia/format to preserve). The textual language is the **author** surface, not the **canonical** surface.

### Alt 2 - Extend Prompt 2 keywords

Add fresh keywords. **Rejected** because the existing keyword set already covers the canonical concepts. Keyword additions require a GID and ADR per the EXTENSIBILITY PROTOCOL.

### Alt 3 - Indentation-sensitive layout

Use Python/Rust-style structural indentation. **Rejected** for v1 because indentation adds parser complexity without author benefit for a language whose primary content is declarative. Re-evaluation lives in ADR-P3-021 (future authoring forms).

### Alt 4 - Add tuple / first-class union types

Surface author tuple literals and union types. **Rejected** for v1 because the canonical model does not distinguish tuples from records in `seed.ts`. Deferred to ADR-P3-022.

## Consequences

### Positive

* **Deterministic lowering.** Every textual form has one canonical lowering. Cross-process determinism is preserved per ADR-P3-004 and ADR-P3-003.
* **Reusable infrastructure.** No new SyntaxKind is added.
* **IDE-friendly.** Brace-delimited structure supports deterministic auto-indent, formatter idempotence, and incremental parsing.
* **Lossless CST.** Trivia preservation is governed by `GSPL_LEXICAL_GRAMMAR.md`; the textual-language grammar adds no parser tokens.
* **Diagnostic uniformity.** `GSPL-PARSE-*` codes, `GSPL-MODULE-*` codes, `GSPL-LEX-*` codes - three namespaces, predictable order.

### Negative

* **Boilerplate.** Authoring a seed requires explicit `intent`, `constraints`, etc. clauses even when defaults are intended.
* **Type forms are restrictive.** Map type and record type overlap on the textual surface.
* **No control flow.** The textual language declares canonical data, not control flow.

### Neutral

* **26 domain identifiers** surface verbatim.
* **17 canonical gene types** surface verbatim.
* **7-axis discipline** is implicit - no textual clause.

## Security implications

* **Identifier analysis** uses the versioned Unicode profile (ADR-P3-005).
* **Effects declared.** `effects { filesystem = read_only }` is the default-safe declaration.
* **No path-traversal hooks.** `import "<path>"`, paths are resolved through ADR-P3-004 (filesystem containment).
* **No environment or wall-clock.** The textual language contains no expression whose value depends on environment or time.

## Determinism implications

* **Keyword ordering.** Keywords are looked up by lexeme via the SyntaxKind registry's `KEYWORD_KINDS` Map. Lookup is O(1) and deterministic.
* **Variant sorting.** Variants sort before canonical lowering by lex key.
* **Effect flattening.** Order is fixed by `EffectKey` declaration in `GSPL_GRAMMAR.contract.json`.
* **Cross-process determinism test** will treat every textual source as a fixture and assert bit-identical canonical lowering across locale/timezone pairs.

## Performance implications

* **O(n) lexing.** Already proven by the lexer slice.
* **O(n) parsing.** Recursive descent + precedence-climbing parser must hold `O(n)` peak memory.
* **O(n) lowering.** A single lowerer pass lowers every textual AST into a canonical seed field set.

## Migration implications

* **v1 migration vector.** No pre-v1 textual sources exist. Future versions accept v1 sources unchanged via a `migrateTo(v2)` lowerer step.
* **Gene-protocol extension.** Adding new gene types needs no textual-language change; types surface as identifiers in `gene` declarations.
* **Identifier profile upgrade.** Bumping the Unicode profile from 15.1 to a later version requires ADR-P3-005 re-validation.

## Validation references

* `docs/specification/GSPL_TEXTUAL_LANGUAGE.md` - full spec this ADR summarizes.
* `docs/specification/GSPL_GRAMMAR.contract.json` - machine-readable contract.
* `scripts/check-syntax-contract.mts` - bidirectional consistency check.
* `npm run check:syntax-contract` - root command wired by this slice.
* `packages/syntax-tree/src/syntax-kind.ts` - the production registry.

## Open questions

* **Authoring sugar.** Will v1.1 introduce `with defaults { ... }` blocks? Reserved for ADR-P3-021.
* **Multi-file compilation.** Multi-module imports are supported syntactically; multi-file compilation is gated by the parser + module graph slices (ADR-P3-016).
* **`suggestion` / `replacement` hints.** Diagnostic help strings are in scope for the diagnostics slice; not v1 of this spec.
