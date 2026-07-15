# Expansion Plan Model

**Status:** ACCEPTED

**Date:** 2026-07-14

**Context:** IR must be translated into deterministic executable operations.

**Decision:** Plan operations have deterministic IDs, inputs, outputs, dependencies, cache keys, provenance, resource estimates, effect requirements, capability requirements, failure behavior, and verification rules. Parallel groups derived from dependency independence.

**Consequences:** Plans are deterministic, verifiable, and cacheable.

**Implementation:** See packages/ for corresponding source.

**Tests:** See packages/*/test/ for test coverage.
