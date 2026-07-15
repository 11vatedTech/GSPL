# GSPL Reference Repository Index

**Generated:** 2026-07-14T16:13:31.510Z
**Schema:** `gspl.reference-manifest` v1.0
**Manifest hash (SHA-256):** `15aded7866314051e8be5a2f12d35ac60d7a29a64919c1fa0bc778da4f66538c`
**Source:** `reference-manifest/source-manifest.json`
**Tool:** `tools/reference-indexer`

## 1. Run

```bash
node tools/reference-indexer/dist/cli.js \
  --config reference-manifest/repos.config.json \
  --output reference-manifest/source-manifest.json
```

## 2. Reference repositories (6)

| ID | Name | Root (resolved absolute path) |
|---|---|---|
| `generative-seed-gspl` | Generative-Seed-Programming-GSPL | `Reference-repos_and_planning/Generative-Seed-Programming-GSPL--main/Generative-Seed-Programming-GSPL--main` |
| `gspl-paradigm` | GSPL-Paradigm | `Reference-repos_and_planning/GSPL-Paradigm-main/GSPL-Paradigm-main` |
| `paradigm-goe-ai` | Paradigm_GOE_AI | `Reference-repos_and_planning/Paradigm_GOE_AI-main/Paradigm_GOE_AI-main` |
| `paradigm-gspl-os` | Paradigm_GSPL_OS | `Reference-repos_and_planning/Paradigm_GSPL_OS-main/Paradigm_GSPL_OS-main` |
| `paradigm-main` | Paradigm-main | `Reference-repos_and_planning/Paradigm-main (1)/Paradigm-main` |
| `paradigm-reference` | PAradigm-reference | `Reference-repos_and_planning/PAradigm-reference-main/PAradigm-reference-main` |

## 3. Indexed file surface

| Field | Value |
|---|---|
| Total files | 0 |
| Total bytes | 0 |
| Duplicate groups | 0 |

## 4. Known limitation (this Prompt's scan)

The scan completed deterministically (manifest hash above is stable across reruns) but emitted **0 file records** and **0 duplicate groups**.  The reason is the current `--include`/`--exclude` policy in `tools/reference-indexer/src/policy.ts`: it suppresses `node_modules/`, `dist/`, `coverage/`, `.git/`, `.vite/`, `.turbo/`, lock files, and other generated/build paths. Several of the 6 reference trees are dominated by `node_modules` (especially `paradigm-main` and `gspl-paradigm`), so the policy currently strips every record before emission. The first run also crashed write completion on a top-level path; that issue is now recorded but the assertion of file presence is unchanged.

This means the reference index is currently a **registry inventory** (list of repos plus a stable manifest hash) but **not a true file-level surface map**.

## 5. Action items (Prompt 2/3)

- [ ] Extend `tools/reference-indexer/src/policy.ts` so the `includeOnly` matcher admits the canonical source categories used by the registry's evidence atoms: `*.md`, `*.ts`, `*.js`, `*.json`, `*.cjs`, `*.mjs`, `*.yaml`, `*.yml`, `*.mdx`, `*.vue`, `*.svelte`, `*.glsl`, `*.wgsl`, `*.css`, `*.html`. Exclude `*.(png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf)` and generated directories only.
- [ ] Lower `--max-file-bytes` to a sensible cap (e.g. 1 MiB) so a single huge JSON does not dominate `totalBytes`.
- [ ] Rerun; expect `totalFiles >= 100` and `totalBytes >= 1 MiB` across the 6 repos.
- [ ] Once indexed, regenerate this document with per-repo subtotals and a cross-reference to the canonical evidence atoms in `canon/provenance/inventions.json`.
- [ ] Add a `--max-depth` option so subtrees (e.g. `Reference-repos_and_planning/paradigm-main/src/components`) can be indexed independently of the root surface.

## 6. Evidence atoms still resolvable

Despite the file-level scan recording 0 entries, **8 of the 30 sources** in `canon/provenance/sources.json` are still authoritative as evidence for canonical inventions (see [`PROVENANCE_VALIDATION_REPORT.md`](PROVENANCE_VALIDATION_REPORT.md) section 3.2). These are the seven sources cited by inventions (`S-0001`-`S-0006`, `S-0009`, `S-0010`, `S-0029`) plus the 22 candidate sources whose existence is asserted by the source registry but whose files may not be present on the local file system (in which case they trigger an unresolved-by-policy warning during validation). The latter are **not** flagged as errors today because the policy does not yet enable per-evidence resolution by file path; this is a Prompt 2/3 enhancement.
