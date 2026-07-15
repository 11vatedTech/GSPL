# Deferred Adversarial Archive Spec (Prompt 2 §3)

The 13-case adversarial test set for `scripts/source-package/verify.mts` was deferred from the Prompt 2 §3 closure commit on `repair/prompt-2-canonical-core` due to heredoc-truncation failures. The spec below is the recoverable design so the work can be re-issued in a follow-up.

## 13-case adversarial coverage

1. `../escape` — archive entry whose logical path traverses outside the extracted root; verify the inspector rejects it.
2. `/absolute/path` — archive entry starting with `/`; reject (absolute logical path).
3. `C:\absolute\path` — drive-letter path; reject.
4. `UNC path` (`\server\share\file`) — reject.
5. `duplicate names` — two entries with the same logical path; reject.
6. `case collision` — `Foo` and `foo` on case-insensitive filesystems; reject or normalise.
7. `symlink escape` — archive containing a symlink that points outside the extracted root; reject.
8. `corrupted content` — archive with truncated gzip stream; reject with structured diagnostic.
9. `manifest mismatch` — manifest hash field does not match recomputed hash; reject.
10. `gzip bomb` — archive that decompresses to a pathological size; reject via decompression-bomb limit.
11. `missing-archive` — verify.mts invoked with non-existent archive path; reject.
12. `missing-manifest` — archive present, manifest JSON absent; reject.
13. `main() CLI` — `verify.mts` exit code 1 on any failure; exit code 0 on success.

## Implementation guidance

- Use Node `node:zlib` `gunzipSync` + `node:fs` `mkdtempSync` for isolated extraction.
- Each case should be a separate test file under `scripts/source-package.test/`.
- Reference the implementation in `scripts/source-package/verify.mts` and extend it with adversarial-path detection.

## Re-open criteria

Re-open this ADR as a Prompt 3 follow-up after the branch-protection + matrix-green preconditions are met. Until then, the working `verify.mts` performs format + hash + manifest-shape validation but does NOT exercise the 13 adversarial cases.
