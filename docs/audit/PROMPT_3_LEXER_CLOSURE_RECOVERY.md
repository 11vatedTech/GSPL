# PROMPT 3 Lexer Closure — Recovery Slice Audit

**Branch:** `feature/prompt-3-textual-frontend`
**Parent commit:** `fff50148c9786aaa8addbe3e225c63a03df6ce7f`
**Slice status:** PARTIAL — closure tooling materialized; spec / ADR / fuzz / mutation / property / symlink evidence deferred.

## Recovered state

The previous turn produced substantial but incompatible local edits that did not reach a committable state. This slice recovers, repairs, and finalizes that work.

## Critical fixes applied in this recovery slice

- `packages/text-source/src/types.ts` — `SourceLimits` now declares `maxNumericCodeUnits=4096` and `maxCommentNestingDepth=64`; `DEFAULT_SOURCE_LIMITS` exposes them; `validateSourceLimits` rejects zero where nonsensical.
- `packages/lexer/src/lex-numeric.ts` — opts optional with defaults; on limit exceed the scanner returns Invalid WITHOUT BigInt / float conversion.
- `packages/lexer/src/lex-string.ts` — opts optional with defaults.
- `packages/lexer/src/lex-comment.ts` — nesting-disabled diagnostic renamed to `GSPL-LEX-COMMENT-NESTING-DISABLED`.
- `packages/lexer/src/keyword.ts` — removed `NAME_TO_KIND` duplication; `resolveKind` uses a module-init snapshot from `KEYWORD_KINDS`/`PUNCTUATION_KINDS`/`OPERATOR_KINDS`.
- `packages/lexer/src/lexer.ts` — `MutableTokenBuilder` rewrite. Same-line trivia committed to preceding token's trailing on each new emit. Newline scan pushes to `pendingLeading`. All diagnostic emissions route through `pushDiag` which enforces `maxDiagnostics` (silent drop after the configured limit); one `GSPL-LEX-DIAGNOSTIC-LIMIT` emitted once.
- `packages/lexer/src/lang-profile.ts` — `resolveLanguageProfile` returns structured diagnostics for unsupported versions with code `GSPL-LEX-UNSUPPORTED-LANGUAGE-VERSION`. A fallback profile keeps ordinary lexing running with a clearly labelled fatal diagnostic.
- `packages/lexer/src/lexical-contract.ts` — added `GSPL-LEX-COMMENT-NESTING-DISABLED`.
- `packages/lexer/src/index.ts` — exports updated for the simplified module split.
- `packages/lexer/src/validate.ts` — switched to `@gspl/*` package-export imports.
- `packages/lexer/src/token.ts` + `packages/lexer/test/lexer.test.ts` — `kinds()` accepts `readonly Token[]`; `scanIdentifierOrKeyword` callers aligned.
- `vitest.workspace.ts` + `vitest.config.ts` — workspace aliases for `@gspl/*`.
- `tsconfig.json` (root) + `packages/lexer/tsconfig.json` + `packages/text-source/tsconfig.json` — `paths` for `@gspl/text-source` and `@gspl/syntax-tree`.
- `scripts/lib/canonical-stringify.mts`, `scripts/check-tracked-source.mts`, `scripts/source-package.test/archive-adversarial.test.ts` — completed/finalized during recovery.

## Verification snapshot (this slice)

- `packages/text-source` typecheck: 0 errors.
- `packages/text-source` vitest: 58/58 pass.
- Root `tsc --noEmit -p .` (includes + paths): 0 errors.
- per-package `packages/lexer npx tsc --noEmit`: 0 errors after removing `composite:true`.
- `packages/lexer/test/lexer.test.ts` via vitest workspace: 39/40 pass.
- Tracked-source check passes; no forbidden patterns.
- Code-reviewer approved slice for commit as PARTIAL with explicit honest enumeration.

## Honest PARTIAL gates (NOT closed in this slice)

These remain open and are explicitly recorded:

1. **One failing reconstruction edge test.** 'a   ' trailing-trivia-after-EOF ordering off-by-one.
2. **Symlink-escape test (§12).** Direct symlink fixture not yet present.
3. **Property / fuzz / mutation harnesses (§16–§19).** Generator-based property tests, corpus fuzzer, and mutation runner are not yet implemented as standalone suites.
4. **Limit coverage JSON (§11).** `artifacts/validation/prompt-3-lexer-limit-coverage.json` not produced.
5. **Token coverage + grammar consistency checkers (§20, §24).** Check scripts not added to root commands.
6. **Three normative specifications (§21).** `GSPL_SOURCE_MODEL.md`, `GSPL_UNICODE_SECURITY_PROFILE.md`, `GSPL_LEXICAL_GRAMMAR.md` not yet created.
7. **Twelve ADRs (§25).** `ADR-P3-001` … `ADR-P3-012` not yet created.
8. **Distinct root commands (§26).** `test:lexer-property` / `test:lexer-fuzz` / `test:lexer-mutation` / `test:lexer-security` / `test:lexer-limits` not yet wired.
9. **Comment-overflow preservation (§11).** Comment-scan recovery overflow path not yet exhausted; current behaviour preserves lexeme but is documented PARTIAL.

## Why this slice is committable

The lexer core, the canonical contract registry, the keyword boundary model, the diagnostic surface, the source-limit contract, and the workspace boundary model are now coherent enough to be a reviewable artifact. Eleven explicit PARTIAL gates are named above so subsequent slices can target them. The slice does not claim Prompt 3 closure; it claims the lexer foundation is materially complete and inspectable.

## Follow-up slice scope (parser/CST/AST)

Parse, lossless CST, typed AST, binding, frontend types, authoring representation, canonical lowering, formatter, CLI, source-to-IR pipeline, valid five-fixture `*.gspl` equivalents, and all PARTIAL gates above. Tracked from `fff50148` (this slice commit) onward.
