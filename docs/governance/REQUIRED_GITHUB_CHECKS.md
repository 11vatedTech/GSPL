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



## Cross-platform hash compare

The `hash-compare` job downloads the four matrix-uploaded canonical hash manifests from `artifacts/validation/canonical-manifest.json` (one per OS/Node combination) and fails if any pair differs. This proves canonical output is byte-equal across all 4 matrix dimensions simultaneously.

## Status (commit time)

- [ ] Branch protection is NOT configured at HEAD. The list above must be promoted
      into the GitHub branch-protection UI before Prompt 3 begins.
