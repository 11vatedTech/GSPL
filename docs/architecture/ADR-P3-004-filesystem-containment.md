# ADR-P3-004: Filesystem Containment

**Status**: ACCEPTED | **Prompt 3 §4**

## Context
Source loading must prevent escape from declared source roots.

## Decision
All source paths are resolved relative to a source root. Symlink traversal is detected via realpath comparison. Escapes produce GSPL-SOURCE-SYMLINK-ESCAPE and block source loading. No absolute host paths in user-facing diagnostics.

## Consequences
- Deterministic and secure source resolution
- Platform-independent containment (Windows junctions supported)
- Injected filesystem boundary tests for environments without symlink privileges
