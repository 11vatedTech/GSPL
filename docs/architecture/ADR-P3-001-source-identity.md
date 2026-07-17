# ADR-P3-001: Source Identity

**Status**: ACCEPTED | **Prompt 3 § source identity**

## Context
GSPL needs deterministic source identification across processes, timezones, and environments.

## Decision
SourceId is derived from a content hash of the immutable source snapshot. SourceSnapshotId changes when content changes. Both are deterministic — same bytes → same IDs.

## Alternatives
- Random UUIDs: rejected for non-determinism
- File paths: rejected for environment dependence

## Consequences
- Deterministic CI/CD reproducibility
- Source-level caching works across processes
- No wall-clock or host-path dependence
