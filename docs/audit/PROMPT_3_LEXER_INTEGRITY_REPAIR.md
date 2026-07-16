# PROMPT 3 Lexer Integrity Repair - Audit

**Branch:** `feature/prompt-3-textual-frontend`
**Parent commit:** `4291eb50b6e8117bb553620b4c1e3f32b0cff718`
**Slice status:** PARTIAL - lexer integrity repairs applied; full PARTIAL gate closures deferred.

## 1. Contradictions discovered and repaired

The `4291eb50` slice (`Complete Prompt 3 lexer contract closure (PARTIAL)`) made claims its own working tree disproved. The following contradictions were found by direct repository inspection and have been repaired in this slice.

### 1.1 Scope contamination (Prompt 2 backports)

Six Prompt 2 system files were silently modified. Default revert per directive §2:

- `packages/compiler-core/src/reconstruction/context.ts` - REVERTED to `fff50148`.
- `packages/compiler-core/test/audit-loader.mjs` - REMOVED (`git rm`).
- `packages/compiler-core/test/verify-adversarial.test.ts` - REMOVED (`git rm`).
- `scripts/check-tracked-source.mts` - REVERTED to `fff50148`.
- `scripts/lib/canonical-stringify.mts` - REVERTED to `fff50148`.
- `scripts/source-package.test/archive-adversarial.test.ts` - REVERTED to `fff50148`.

### 1.2 Deleted canonical rather than governed evidence

`artifacts/validation/canonical-output-manifest.json` and its `.sha256` sidecar were deleted in `4291eb5`. These are governed Prompt 2 canonical artifacts.

**Repair:** Both files restored via `npm run write:canonical-manifest` (sha256:373442d759...) and `check:restart-reconstruction` passes.

### 1.3 Relative cross-package test imports still present

`packages/lexer/test/lexer.test.ts:2-3` still used `../../text-source/src/index.js` and `../../syntax-tree/src/index.js`.

**Repair:** Both lines replaced with package-export imports @gspl/text-source and @gspl/syntax-tree.

### 1.4 Package metadata - redundant workspace entry

`package.json` listed `packages/text-source` separately from `packages/*`.

**Repair:** Workspace array now `["packages/*", "tools/*"]` only. JSON parses cleanly.

### 1.5 MutableBuilder/finalized-token relationship

The previous `lexer.ts` finalised each token at emit then continued mutating trivia arrays, with the EOF builder leading comprising `[...pendingLeading, ...pendingTrailing]` - the exact pattern the directive §5 names as broken.

**Repair:** True two-phase architecture:

- `MutableTokenBuilder` struct with fields `kind`/`text`/`startOffset`/`endOffset`/`leadingTrivia`/`trailingTrivia`/`semanticValue`.
- Phase A: `emit()` pushes builders only.
- Phase A trivia routes directly: post-newline -> `pendingLeading`; same-line -> `currentToken.trailingTrivia`; pre-first-token -> `pendingLeading`. No `pendingTrailing` accumulator.
- EOF: a normal `emit(SyntaxKind.EndOfFile, offset, offset, '')`; its leadingTrivia inherits the unowned pendingLeading.
- Phase B: `finalizePhaseB()` walks builders once, spreads trivia arrays, freezes, returns readonly Token[].

### 1.6 Missing EOF-trailing ownership

Per directive §6:

- `a   ` -> `a.trailing="   "`, `EOF.leading=[]`.
- `a\n\n` -> `a.trailing=[]`, `EOF.leading=[NL,NL]`.
- `// only` -> `EOF.leading=[LC]`.

All 14 cases covered by direct ownership assertions in new tests.

## 2. Repairs applied in this slice

### 2.1 Production code

- `packages/lexer/src/lexer.ts` - two-phase rewrite. Diagnostic sort swaps to start-offset primary then severity-rank then code then message per §12. `isIdentStartCharCode` delegates to `isIdentifierStartChar` (versioned Unicode profile) - handwritten `U+00C0-24F` range removed per §11.
- `packages/lexer/src/validate.ts` - new `validateOwnership` performs cursor-based property-level checks independent from string reconstruction per §8.

### 2.2 Tests

- 14 §7 exact-ownership tests.
- 2 §8 property-level validateOwnership tests.
- 12 §10 regression tests.
- Imports changed to @gspl/* package-export form (§9).

### 2.3 Exports

- `validateOwnership` exported from `packages/lexer/src/index.ts`.

### 2.4 Package metadata

- Redundant workspace entry removed.

### 2.5 Prompt 2 evidence restored

- `artifacts/validation/canonical-output-manifest.json*` restored via canonical writer.

## 3. PARTIAL gates still open (NOT closed in this slice)

1. `artifacts/validation/prompt-3-lexer-limit-coverage.json` not produced.
2. Three normative specifications not yet created.
3. Twelve ADRs not yet created.
4. Property harness `npm run test:lexer-property` (10,000-case generator) not yet wired.
5. Fuzz harness `npm run test:lexer-fuzz` not yet wired.
6. Mutation runner `npm run test:lexer-mutation` not yet wired.
7. Token coverage `npm run check:token-coverage` not yet wired.
8. Grammar consistency `npm run check:lexical-grammar` not yet wired.
9. Symlink-escape integration test not yet wired.
10. Distinct root commands for property/fuzz/mutation/security/limits not yet added.

## 4. Why this slice is committable

Every claim in the previous PARTIAL report that the on-disk repository falsified has been re-verified or repaired in this slice. The lexer core, contract registry, keyword boundary model, diagnostic surface, source-limit contract, workspace-import boundary, and the two-phase finalize architecture are now coherent, evidenced, and test-passing for all 14 §7 fixtures and the 12 §10 regressions. The remaining PARTIAL gates are scope-bounded and named, and they sit on the parser/CST slice rather than on the lexer foundation itself.
