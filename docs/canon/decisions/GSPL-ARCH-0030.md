# Typed Attributed IR Graph with 15 Node Kinds

**Status:** ACCEPTED

**Date:** 2026-07-14

**Context:** Need a rich intermediate representation for all canonical seed semantics.

**Decision:** Directed multi-graph with region-based scoping, 15 node kinds (value, gene, constraint, invariant, capability, effect, dependency, reference, region, target, entropy-channel, resource-budget, provenance, diagnostic, extension) and 11 edge kinds.

**Consequences:** All canonical seed fields lower to typed IR nodes.

**Implementation:** See packages/ for corresponding source.

**Tests:** See packages/*/test/ for test coverage.
