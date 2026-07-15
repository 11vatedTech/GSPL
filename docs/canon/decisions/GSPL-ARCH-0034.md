# Constraints/Capabilities/Effects Security Model

**Status:** ACCEPTED

**Date:** 2026-07-14

**Context:** Canonical compilation must be effect-free by default. No ambient authority.

**Decision:** Every operation declares required capabilities. Effects are denied by default. Capability grants are explicit with scope and provenance. No package, descriptor, or rule receives ambient authority.

**Consequences:** Effects require explicit authorization. Canonical planning is isolated from effectful execution.

**Implementation:** See packages/ for corresponding source.

**Tests:** See packages/*/test/ for test coverage.
