# Build, Test, and Execution Baseline

**Status:** Operational baseline for Prompt 1; updated by every canon-bootstrap run and every CI cycle.

This document records the actual execution of build, test, and conformance steps in the canon. Reference repos are **not modified**; they are run only for evidence.

## 1. Canon-side commands (this repo)

```bash
# install
npm install

# build (TypeScript -> dist/)
npm run build --workspaces --if-present

# type check
npm run typecheck --workspaces --if-present

# tests (vitest across every workspace)
npm run test --workspaces --if-present

# bootstrap (emits inventions.json / sources.json / claims.json + 3 MD ledgers)
node tools/canon-bootstrap/dist/cli.js \
  --write-and-validate \
  --repo-root "$PWD"

# reference indexer run
node tools/reference-indexer/dist/cli.js \
  --config reference-manifest/repos.config.json \
  --output reference-manifest/source-manifest.json

# provenance check (exits 0 on PASS, 2 on FAIL)
node tools/provenance-checker/dist/cli.js \
  --inventions canon/provenance/inventions.json \
  --decisions docs/audit/architecture-decisions.json \
  --sources canon/provenance/sources.json \
  --report canon/provenance/validation-report.json

# claim classification (exits 0 on PASS, 2 on FAIL)
node tools/claim-classifier/dist/cli.js \
  --claims canon/provenance/claims.json \
  --report canon/provenance/claim-classification-report.json
```

## 2. Reference-repo commands (evidence only; reference repos not modified)

```bash
# paradigm-reference (spec repo, Markdown-only; no build needed)
ls Reference-repos_and_planning/PAradigm-reference-main/PAradigm-reference-main/spec/

# paradigm-gspl-os (vitest + tsc)
cd Reference-repos_and_planning/Paradigm_GSPL_OS-main/Paradigm_GSPL_OS-main
npm install
npm run build   # tsc
npm test        # vitest run
cd "$REPO_ROOT"
```

A canonical full run of every reference repo is scheduled for Prompt 3 to keep Prompt 1 within budget.

## 3. Environment

- Node v24.18.0
- npm 11.16.0
- OS Windows + Git Bash
- TypeScript 5.5+
- Vitest 2.0+

## 4. Reference-repo build status (recorded as audit report)

| Repo | Build status | Test status | Notes |
|---|---|---|---|
| paradigm-reference | n/a (Markdown only) | n/a | spec repo; evidence source for 6 inventions |
| paradigm-gspl-os | PASS per README | 13 test files; property tests PASS per README | Scheduled full re-run for Prompt 3 |
| paradigm-main | not verified at file level (volume of "Phase X complete" reports is aspirational, not audited) | mix of vitest+playwright | Most cited source for the registry's 23 orphan entries; full scan deferred to Prompt 2/3 |
| generative-seed-programming-gspl | workspaces; build passes per `package.json` | various test scripts in workspaces | Workspace-style build |
| gspl-paradigm | pnpm workspace | pnpm install required | Likely duplicate of `generative-seed-programming-gspl`; verify in Prompt 2 |
| paradigm-goe-ai | n/a (README only) | n/a | No GSPL content (sentinel for empty/duplicate refs) |

See `build-test-execution-baseline.json` for the machine-readable form.

## 5. Known environmental risks

- The reference repos include `package-lock.json`, `pnpm-lock.yaml`, `bun.lock`; they are not interchangeable. Per reference repo, use the matching package manager.
- `paradigm-main` is large and includes Dockerfiles, nginx configs, dual agents. It is operationally risky to "build the whole thing" in CI; default to the targeted-scan policy.
- The reference-indexer policy currently emits 0 records because every reference repo's tree is dominated by `node_modules`. Prompt 2/3 will tighten the policy (see `REFERENCE_INDEX.md` section 5).

## 6. Exit-code policy

- `npm run typecheck` — exits 0 on success, non-zero on fail.
- `npm test` — exits 0 on pass, 1 on fail.
- `reference-indexer` — exits 0 on success, 64 (EX_USAGE) on bad args.
- `provenance-checker` — exits 0 on PASS, 2 on FAIL.
- `claim-classifier` — exits 0 on PASS, 2 on FAIL.
- `canon-bootstrap` — exits 0 on PASS (write or write-and-validate), 2 on FAIL, 64 on bad args.

## 7. Phase 1 completion evidence (this run, 2026-07-14)

### 7.1 TypeScript typecheck across all 5 workspaces

| Workspace | Result |
|---|---|
| `packages/canon-foundation` | PASS |
| `tools/reference-indexer` | PASS |
| `tools/provenance-checker` | PASS |
| `tools/claim-classifier` | PASS |
| `tools/canon-bootstrap` | PASS |

### 7.2 Vitest — total **102 tests pass, 0 fail**

| Workspace | Tests | Duration |
|---|---|---|
| `packages/canon-foundation` | 41 PASS | ~0.9 s |
| `tools/reference-indexer` | 18 PASS | ~1.0 s |
| `tools/provenance-checker` | 16 PASS | ~0.9 s |
| `tools/claim-classifier` | 17 PASS | ~0.9 s |
| `tools/canon-bootstrap` | 10 PASS | ~1.7 s |
| **Total** | **102 / 102** | ~5.4 s |

### 7.3 Canon-bootstrap determinism

Two consecutive `node tools/canon-bootstrap/dist/cli.js --write --repo-root $PWD` invocations produced **byte-identical** SHA-256 hashes for:

```
canon/provenance/inventions.json
canon/provenance/sources.json
canon/provenance/claims.json
```

Result: **DETERMINISM:PASS**. A `generatedAt` constant (`BOOTSTRAP_TIMESTAMP`) is pinned in `tools/canon-bootstrap/src/serialize.ts`; a `consistentStringify` (sorted-keys JSON) canon normalizes object-iteration order.

### 7.4 JSON <-> MD consistency

`canon-bootstrap --write-and-validate` runs both the JSON registry emission AND the consistency checker that compares MD ledgers to the JSON. Result: **consistency: PASS**.

### 7.5 Provenance validation summary

See [`PROVENANCE_VALIDATION_REPORT.md`](PROVENANCE_VALIDATION_REPORT.md). Result: status **PASS**, errors 0, warnings 0, 20 inventions checked, 25 ADRs checked, 30 sources checked. Informational orphans: 1 invention (`GSPL-INV-0007`), 22 sources.

### 7.6 Claim classification summary

See [`CLAIM_CLASSIFICATION_REPORT.md`](CLAIM_CLASSIFICATION_REPORT.md). Result: status **PASS**, errors 0, warnings 0, 12 claims checked, 0 illegal transitions, 0 unsupported. Distribution: 0 PROVEN, 2 IMPLEMENTED, 2 PARTIALLY_IMPLEMENTED, 2 PROTOTYPED, 2 THEORETICAL, 2 RESEARCH_REQUIRED, 0 UNSUPPORTED, 2 REFUTED.

### 7.7 Reference repository index

See [`REFERENCE_INDEX.md`](REFERENCE_INDEX.md). Result: 6 reference repos identified; **0 file records emitted** by the indexer in this Prompt (see section 5 of `REFERENCE_INDEX.md` for the policy-tightening plan).

## 8. Open items / Prompt 2 readiness

1. **Type drift across packages** — `InventionEntry`, `SourceRecord`, `ClaimEntry` are declared independently in `provenance-checker/src/types.ts`, `claim-classifier/src/types.ts`, and `canon-bootstrap/src/types.ts`. Any future field addition in Prompt 2 will silently desynchronize. Recommended: extract a shared `packages/gspl-types/` consumed by all three tools.
2. **Reference-indexer policy** — currently strips every record. Tighten policy to admit `*.md`, `*.ts`, `*.json`, etc.
3. **1 orphan invention + 22 orphan sources** — the validator surfaced these as informational. Prompt 2 should add ADRs that bind `GSPL-INV-0007` and adopt the candidate sources (or remove them from the registry).
4. **`process.argv[1].endsWith('cli.js')` CLI entry-point check** in `canon-bootstrap/src/cli.ts` is brittle under `tsx`, `vitest-in-process`, and other non-vanilla Node runners. Acceptable for production Node 24 + Git Bash on Windows; should be hardened or commented as deliberate before Prompt 2.
5. **`moduleResolution: "node"` legacy workaround** in `canon-bootstrap/src/index.ts` adds `/index.js` paths for directory aggregators. Cleaner: switch `tools/canon-bootstrap/tsconfig.json` `moduleResolution` to `"bundler"`.
6. **No PROVEN claims** — by design (no end-to-end seed-to-codebase reconstruction tests yet). Promotion to PROVEN is the first verifiable target for Prompt 2/3.
