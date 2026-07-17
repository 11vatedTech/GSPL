# PROMPT 3 MASTER COMPLETION BASELINE

Generated at HEAD: 9f5117f36af81c1e4a8e44cac629609a34a5ae77

This document records the verbatim repository state at the start of the
Prompt 3 Master Completion directive (single master directive for Prompt 3 of 10).

## Verification commands and results

```bash
git status --short         # clean
git rev-parse HEAD         # 9f5117f36af81c1e4a8e44cac629609a34a5ae77
git rev-parse --abbrev-ref HEAD  # feature/prompt-3-textual-frontend
npx tsc --noEmit -p .      # exit 0
```

## Implementation status by subsystem

| Subsystem                                           | Status       |
|-----------------------------------------------------|--------------|
| Source identity (SourceId / snapshot / content hash)| COMPLETE     |
| Strict RFC 3629 UTF-8 decoding                      | COMPLETE     |
| Unicode source security (analysis in normal lexing) | COMPLETE     |
| Logical path normalization (single canonical util)  | COMPLETE     |
| Real symlink containment (filesystem resolution)    | PARTIAL      |
| Source limits (12 declared, validated constructors) | COMPLETE     |
| Lexer (lossless tokenization, two-phase builders)   | COMPLETE     |
| Code-point-aware identifier dispatch                | COMPLETE     |
| IdentifierLexicalValue metadata (ASCII + Unicode)   | COMPLETE     |
| Discriminated SemanticValue union (6 kinds)         | COMPLETE     |
| Structured diagnostics with deterministic ordering  | COMPLETE     |
| maxTriviaCodeUnits enforcement (single emitter)     | COMPLETE     |
| SyntaxKind registry + green-token primitives        | PARTIAL      |
| Lexical grammar contract machine checker            | MISSING      |
| Limit coverage machine checker                      | MISSING      |
| Token / diagnostic coverage machine checker          | MISSING      |
| Package boundary machine checker                    | MISSING      |
| Package basics machine checker                      | MISSING      |
| Cross-process determinism harness                   | MISSING      |
| Property tests (10k+ generated)                     | MISSING      |
| Corpus fuzz harness                                 | MISSING      |
| Mutation harness                                    | MISSING      |
| Security tests                                      | MISSING      |
| Limit tests                                         | MISSING      |
| Parser (recursive descent + Pratt for expressions)  | MISSING      |
| Green/red lossless CST                              | MISSING      |
| Typed AST (discriminated, source-linked)            | MISSING      |
| Module resolver (deterministic, cycle-aware)        | MISSING      |
| Symbol binder (immutable side tables)               | MISSING      |
| Frontend type analysis                              | MISSING      |
| Authoring representation                            | MISSING      |
| Canonical lowering entry point                      | MISSING      |
| IR lowering entry point                             | MISSING      |
| Formatter (lossless CST-based, idempotent)          | MISSING      |
| CLI (gspl lex/parse/check/format/lower/ir/explain)  | MISSING      |
| Compiler-frontend SDK                               | MISSING      |
| Incremental APIs (computeTextChangeRange ...)       | MISSING      |
| 16 normative specs                                  | MISSING      |
| 30 ADRs (12 lexer + 18 frontend)                    | MISSING      |
| Governed fixtures (syntax + frontend packages)      | MISSING      |
| gspl explain provenance CLI                         | MISSING      |
| Cross-process frontend determinism                  | MISSING      |

## Existing root scripts inventory

`package.json` already references the following lexer-coverage scripts
even though they do not yet exist on disk:

- scripts/check-package-boundaries.mts        # MISSING
- scripts/check-lexer-token-coverage.mts      # MISSING
- scripts/check-lexical-grammar.mts           # MISSING
- scripts/check-lexer-limit-coverage.mts      # MISSING
- scripts/check-lexer-determinism.mts         # MISSING
- scripts/check-package-basics.mts            # MISSING

These are declared-root-build defects per the master directive §5.1.

## Existing test files per package

`vitest --workspace=vitest.workspace.ts run packages/lexer/test/`:

- lexer.test.ts                # EXISTS, 89 tests (architecture-centerpiece)
- property.test.ts             # MISSING
- fuzz.test.ts                 # MISSING
- mutation.test.ts             # MISSING
- security.test.ts             # MISSING
- limits.test.ts               # MISSING

## Verification ladder (current)

- ROOT tsc -p .                                 : 0
- packages/text-source:                        58/58
- packages/lexer/test/lexer.test.ts:           89/89
- artifacts/validation/prompt-3-lexer-limit-coverage.json: NOT YET GENERATED
- artifacts/validation/prompt-3-lexer-mutation-report.json: NOT YET GENERATED
- forbidden-tracked-artifacts (node_modules /dist/ coverage tsbuildinfo): CLEAN

## Architectural debt noted

1. The lexer landed at 9f5117f but every subordinate verification gate
   (limits / coverage / fuzz / mutation / cross-process / boundary) is
   still referenced in `package.json` only - no clue-less build target.
2. The textual language grammar, lossless CST node families, parser,
   AST, module resolver, binder, authoring model, canonical+IR lowerers,
   formatter, CLI, and SDK all live downstream of the architectural
   closure. None exists.
3. docs/specification/ and docs/architecture/ are empty. Specifications
   and ADRs have not been started.
4. Dependency direction:
   packages/compiler-core (Prompt 2) exposes the canonical + IR APIs the
   frontend MUST consume. compiler-core CANNOT import any new frontend
   package; only frontend packages import compiler-core public exports.
5. Tests do not collectively multiply to the 10k+ property / hundreds-of-
   fuzz / dozens-of-mutation footprints demanded by §5.5-§5.7.

## Master directive execution philosophy

The master directive covers 36 sections and 53 completion gates. The
realistic per-turn scope is ONE coherent slice (~ 5-15 files, one new
package or one verification substrate). Each turn produces one coordinated
commit; the final report is returned only after the entire Prompt 3 gate
passes. This is a multi-turn execution directive.
