# GSPL Versioning and Migration

**Version:** 1.0 | **Package:** @gspl/canon-foundation

## 1. Normative Rules

**GSPL-VER-001:** Every schema MUST declare a version.
**GSPL-VER-002:** Migrations MUST declare the mapping from source to target schema version.
**GSPL-VER-003:** Canonical migration records MUST be deterministic (no wall-clock timestamps).
**GSPL-VER-004:** Multi-step migration paths MUST be discoverable.
**GSPL-VER-005:** Migration cycles MUST be detected and reported.
**GSPL-VER-006:** Breaking semantic migrations MUST be explicitly marked.
**GSPL-VER-007:** Irreversible migrations MUST be explicitly marked.
**GSPL-VER-008:** Version downgrades MUST be detected and reported.

## 2. Migration Kinds

representation, semantic, compiler, target, knowledge

## 3. Implementation

- Package: @gspl/canon-foundation
- Module: src/migration/versioning.ts
