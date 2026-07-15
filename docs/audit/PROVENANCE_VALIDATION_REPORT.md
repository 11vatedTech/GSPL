# GSPL Provenance Validation Report

**Generated:** 2026-07-14T16:18:26.558Z
**Schema:** `gspl.provenance-report` v1.0
**Source:** `canon/provenance/validation-report.json`
**Tool:** `tools/provenance-checker`

## 1. Run

```bash
node tools/provenance-checker/dist/cli.js \
  --inventions canon/provenance/inventions.json \
  --decisions docs/audit/architecture-decisions.json \
  --sources canon/provenance/sources.json \
  --report canon/provenance/validation-report.json
```

## 2. Result

| Field | Value |
|---|---|
| Status | **PASS** |
| Errors | 0 |
| Warnings | 0 |
| Inventions checked | 20 |
| Architecture decisions checked | 25 |
| Sources checked | 30 |

## 3. Findings — Orphans (informational, not violations)

The following items have no inbound reference from any architecture-decision entry. They appear in `summary.orphaned*` and are **not** counted as errors.

### 3.1 Orphan inventions (1)

| ID | Canonical name | Disposition |
|---|---|---|
| `GSPL-INV-0007` | Per-gene-type 5-operator suite | ADAPT |

This invention is a leaf in the dependency graph: nothing references it from `architecture-decisions.json`. It is kept in the ledger as documentation of the `validate / mutate / crossover / distance / canonicalize` operator convention. Downstream ADRs in Prompt 2 may adopt it.

### 3.2 Orphan sources (22)

| ID group | Count | Origin |
|---|---|---|
| `S-0007`, `S-0008` | 2 | `Reference-repos_and_planning/Paradigm-main (1)/Paradigm-main` (paradigm-main) |
| `S-0011` ... `S-0030` | 20 | Remaining reference repos (generative-seed-gspl, gspl-paradigm, paradigm-goe-ai, paradigm-gspl-os, etc.) |

These records enumerate artefacts from the 6 reference repos but no canonical invention cites them (yet). They are kept for traceability and discovery. The **8** sources that **are** cited as evidence (per the validator: 30 total - 22 orphans) are `S-0001` ... `S-0006` (paradigm-reference `spec/01`-`spec/06`) plus `S-0009` (canon-foundation `src/types/universal-seed.ts`) and `S-0010` (canon-foundation `vitest.config.ts`). Note: `S-0029` (paradigm-gspl-os `vitest.config.ts`) is recorded by the source registry but its evidence is **not** cited by any canonical invention in this run and so appears in `summary.orphanedSources`; its registry entry is retained for traceability and an ADR adopting it is planned for Prompt 2.

### 3.3 Unresolved conflicts

None (`summary.unresolvedConflicts: []`). The deliberate live conflict pair `GSPL-INV-0012 <-> GSPL-INV-0013` is recorded in both inventions and is consistent with `ADR-0008`.

### 3.4 Absolute-path leaks

None (`summary.absolutePathLeaks: []`). Every `evidence.file` resolves to a repository-rooted path (`spec/...`, `src/...`, `packages/...`, `docs/...`) — no `[A-Za-z]:\/...` or `\/...` machine-specific prefix was detected. `archive://` URIs are tolerated and trigger no error.

## 4. Schema compliance

All 20 inventions satisfy the user-spec schema — every entry has `canonicalName`, `aliases`, `founderIntent`, `definition`, `problemSolved`, `evidence` (as `ProvenanceSource[]`), `implementationStatus`, `dependencies`, `conflicts`, `risks`, `disposition`, `targetSubsystem`, `createdAtPolicy`, `schemaVersion: "1.0"`. All 30 sources carry `sourceId`, `repositoryId`, `repositoryPath`, `relativePath`, `contentHash`, `sourceType`, `language`, `symbolOrSection`, `availability`, `verificationStatus`, `notes`. All 25 architecture decisions reference at least 1 canonical source via the `evidence: ProvenanceSource[]` field.

## 5. Determinism

The validator report itself includes a `generatedAt` timestamp (informational). The canonical JSON registries (`inventions.json`, `sources.json`, `claims.json`) are emitted byte-identically across two consecutive `canon-bootstrap --write` invocations. See `BUILD_TEST_AND_EXECUTION_BASELINE.md` section 7.
