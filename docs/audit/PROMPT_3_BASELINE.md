# Prompt 3 Baseline

**Date:** 2026-07-15
**Branch:** feature/prompt-3-textual-frontend (created from repair/prompt-2-canonical-core)

## Baseline commit

```text
570b0645487f7eb12dbf1567e65e03faa49d76a3
```

This commit contains the complete Prompt 2 adversarial archive closure:
- `verify.mts` content-block skip + UNC-before-absolute
- `archive.mts` packTar content fix
- `archive-adversarial.test.ts` rewritten
- `verify-adversarial.test.ts` test #14 fix

## Preflight results

| Command | Result |
| --- | --- |
| `npm ci` | PASSED (exit 0) |
| `npm run typecheck:all` | PASSED (0 errors) |
| `npm run build` | PASSED |
| `npm test` | PASSED (2 files, 25 tests) |
| `npm run check:roundtrip` | PASSED |
| `npm run check:restart-reconstruction` | PASSED (5 fixtures, hashes match) |
| `npm run check:tracked-source` | PASSED (0 violations) |

## Prompt 2 deferred work (does not block Prompt 3 architecture)

- GitHub Actions matrix run (Ubuntu/Windows x Node 20/22)
- Cross-platform source-archive byte equality proof
- Branch protection configuration
- PR open (requires `gh auth login`)

These are release-verification concerns, not frontend architecture concerns.
The Prompt 3 textual language design proceeds independently.
