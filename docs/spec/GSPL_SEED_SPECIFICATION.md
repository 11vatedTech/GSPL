# GSPL Seed Specification

**Version:** 1.0 | **Schema:** gspl.canonical-seed v1.0

## 1. Seed Structure

The canonical seed is the normalized, content-addressable representation of a GSPL program.

### 1.1 Normative Rules

**GSPL-SEED-001:** Every seed MUST declare schema: gspl.canonical-seed.
**GSPL-SEED-002:** Every seed MUST declare a schemaVersion.
**GSPL-SEED-003:** Every seed MUST have an identity block with a contentId (SHA-256).
**GSPL-SEED-004:** Every gene in the payload MUST reference a registered gene type.
**GSPL-SEED-005:** Effect permissions MUST default to 
one (filesystem, process, network, etc.).
**GSPL-SEED-006:** The entropy declaration MUST specify the algorithm and version.
**GSPL-SEED-007:** Lineage MUST declare the operation kind and generation number.
**GSPL-SEED-008:** Every seed MUST declare at least one target contract.

### 1.2 Field Hash Policy

| Field | Policy |
|-------|--------|
| identity.contentId | DERIVED |
| payload | HASHED |
| constraints | HASHED |
| dependencies | HASHED |
| provenance.created | NON_HASHED |
| provenance.modified | NON_HASHED |

### 1.3 Implementation

- Package: @gspl/seed-format
- Schema: src/seed.ts
- Operations: src/seed-ops.ts
- Hash policy: HASH_POLICY export
