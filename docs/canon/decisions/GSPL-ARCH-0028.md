# Canonical Seed Hash/Non-Hash Separation

**Status:** ACCEPTED

**Date:** 2026-07-14

**Context:** Content hashing must be deterministic and exclude operational metadata.

**Decision:** Field-level HASH_POLICY with HASHED/NON_HASHED/DERIVED categories. contentId is DERIVED and excluded from hash material.

**Consequences:** Changing authoring-only metadata does not invalidate canonical hashes.

**Implementation:** See packages/ for corresponding source.

**Tests:** See packages/*/test/ for test coverage.
