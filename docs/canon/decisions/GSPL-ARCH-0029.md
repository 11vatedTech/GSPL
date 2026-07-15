# Extensible Gene Type Registry

**Status:** ACCEPTED

**Date:** 2026-07-14

**Context:** Fixed 17-gene-type inventory insufficient for extension.

**Decision:** Adopted versioned GeneTypeDescriptor protocol with immutable registry. Each type declares schema, canonicalization, validation, lowering, and lifting.

**Consequences:** Third-party gene types can be registered through immutable registry construction.

**Implementation:** See packages/ for corresponding source.

**Tests:** See packages/*/test/ for test coverage.
