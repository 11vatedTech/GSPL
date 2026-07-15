# Cross-Platform Canonicalization

**Status:** ACCEPTED

**Date:** 2026-07-14

**Context:** Canonical output must be byte-identical on Windows, Linux, and macOS.

**Decision:** JCS-based canonicalization with NFKC Unicode normalization, deterministic number serialization, base64url binary encoding, UTC timestamps where semantic. Logical paths use /. Line endings normalized before hashing.

**Consequences:** No OS-dependent behavior in canonical output.

**Implementation:** See packages/ for corresponding source.

**Tests:** See packages/*/test/ for test coverage.
