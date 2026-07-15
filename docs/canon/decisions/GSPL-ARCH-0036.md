# Artifact Graph Model

**Status:** ACCEPTED

**Date:** 2026-07-14

**Context:** Plan results must produce target-neutral artifacts with full provenance.

**Decision:** Artifacts have stable IDs, canonical paths, content hashes, originating IR nodes, originating operations, provenance, target capabilities, and verification status. Graph metadata reports actual counts and byte sizes.

**Consequences:** Every artifact is traceable back to its originating seed, IR, and operation.

**Implementation:** See packages/ for corresponding source.

**Tests:** See packages/*/test/ for test coverage.
