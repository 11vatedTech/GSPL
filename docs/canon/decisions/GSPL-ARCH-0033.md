# Package Lock Model

**Status:** ACCEPTED

**Date:** 2026-07-14

**Context:** External knowledge packages must be resolved deterministically.

**Decision:** Content-addressed resolver with EXACT_ONLY/HIGHEST_COMPATIBLE/LOWEST_COMPATIBLE/LOCKFILE_REQUIRED policies. Canonical compilation always uses LOCKFILE_REQUIRED. Lock hashes include root seed identity and all package content hashes.

**Consequences:** No floating version ranges in canonical compilation.

**Implementation:** See packages/ for corresponding source.

**Tests:** See packages/*/test/ for test coverage.
