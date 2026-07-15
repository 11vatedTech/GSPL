# Required GitHub Checks (Prompt 2 §22)

Until branch protection is configured in the GitHub repository, the following checks
must pass before any change merges into `main`. Apply via Settings → Branches →
Branch protection rules → main.

## Required status checks

| Check name | Job | OS | Node | Required for merge |
|---|---|---|---|---|
| `build / ubuntu / node 20` | build | ubuntu-latest | 20 | yes |
| `build / ubuntu / node 22` | build | ubuntu-latest | 22 | yes |
| `build / windows / node 20` | build | windows-latest | 20 | yes |
| `build / windows / node 22` | build | windows-latest | 22 | yes |
| `hash-compare` | hash-compare | ubuntu-latest | n/a | yes |

## Step commands exercised by every build matrix job

Every matrix job runs the following ordered pipeline. Each step is a real
invocation; no command is an alias for an existing one. Failures abort the
job immediately; later steps do not run after a failure.

1. `npm ci` — clean install from the lockfile.
2. `npm run typecheck:all` — `tsc --noEmit -p .` over `packages/*/src`,
   `tools/*/src`, `scripts/**/*.{ts,mts}`, and tests.
3. `npm run build` — workspace-level `tsc` per package, produces
   `packages/*/dist/`.
4. `npm test` — `npm run test --workspaces --if-present`.
5. `npm run test:property` — `vitest run packages/compiler-core/test/property.test.ts`.
6. `npm run test:fuzz:ci` — `vitest run packages/compiler-core/test/sabotage.test.ts`.
7. `npm run test:mutation:ci` — `vitest run packages/compiler-core/test/mutation.test.ts`.
8. `npm run fixtures:generate` — runs the canonicalization test suite, which
   materialises the per-fixture golden artifacts under the workspace.
9. `npm run check:roundtrip` — same Vitest invocation; proves seed-to-IR-to-seed
   byte-equal round-trip for the 5 reference fixtures.
10. `npm run check:restart-reconstruction` — `node --experimental-strip-types scripts/restart-reconstruction.mts`.
    Spawns 5 pairs of separate `node` processes (producer + consumer per fixture)
    and exits 0 only if every consumer's reconstructed hash pair matches the
    producer's expected pair.
11. `npm run check:packages` — `vitest run packages/package-resolver/test/`.
12. `npm run check:determinism` — `node tools/repo-maintenance/dist/check-determinism-bin.js`.
13. `npm run check:conformance` — conformance suite over the rule registry.
14. `npm run check:clean-source` — fails if forbidden tracked paths exist
    (`node_modules/`, `dist/`, `coverage/`, `*.tsbuildinfo`, etc.).
15. `npm run validate` — composed gate: typecheck + build + test + roundtrip +
    packages + clean-source + clean-bin.
16. `npm run package:source` — `node --experimental-strip-types scripts/source-package/cli.mts .`
    produces `build/gspl-canon-source.tar.gz` + `gspl-canon-source-manifest.json`.
17. `npm run check:source-archive` — `node --experimental-strip-types scripts/source-package/verify.mts ...`
    inspects the produced archive, fails on traversal/absolute/UNC paths,
    missing manifest hash, or non-deterministic ordering.
18. `npm run write:canonical-manifest` — produces
    `artifacts/validation/canonical-output-manifest.json` (schema
    `gspl.canonical-output-manifest` v1.0) with per-fixture 10-hash records
    derived from real pipeline outputs. The companion `.sha256` sidecar
    carries the manifestHash.

The `hash-compare` job uploads exactly the two manifest files
(`canonical-output-manifest.json` + `.sha256`) from each matrix run and the
`compare:canonical-manifests` script verifies the four matrix copies are
byte-equal across the 4 OS/Node combinations. Branch protection must require
all five jobs (4 build + 1 hash-compare) before merge.

## Cross-platform hash compare

The `hash-compare` job downloads the four matrix-uploaded canonical hash manifests from `artifacts/validation/canonical-manifest.json` (one per OS/Node combination) and fails if any pair differs. This proves canonical output is byte-equal across all 4 matrix dimensions simultaneously.

## Status (commit time)

- [ ] Branch protection is NOT configured at HEAD. The list above must be promoted
      into the GitHub branch-protection UI before Prompt 3 begins.
