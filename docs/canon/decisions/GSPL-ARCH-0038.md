# Versioning and Migration

**Status:** ACCEPTED

**Date:** 2026-07-14

**Context:** Schema evolution must not invalidate existing canonical hashes.

**Decision:** Multi-step migration path discovery, deterministic path selection, ambiguity/cycle detection, breaking/irreversible markers, downgrade policy. Canonical migration records exclude ambient timestamps.

**Consequences:** Schema versions are compatibly migratable with full provenance.

**Implementation:** See packages/ for corresponding source.

**Tests:** See packages/*/test/ for test coverage.
