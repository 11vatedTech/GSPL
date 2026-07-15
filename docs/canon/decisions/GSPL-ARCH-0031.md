# Deterministic Graph Normalization

**Status:** ACCEPTED

**Date:** 2026-07-14

**Context:** Equivalent graphs inserted in different orders must produce identical canonical output.

**Decision:** Sort nodes by ID, edges by (from, to, kind). Use SHA-256 over deterministic hash material. Normalization is idempotent.

**Consequences:** Graph insertion order is irrelevant to canonical output.

**Implementation:** See packages/ for corresponding source.

**Tests:** See packages/*/test/ for test coverage.
