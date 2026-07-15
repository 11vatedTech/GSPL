# GSPL Canonical Core Specification

**Version:** 1.0 | **Status:** PROMPT-2 | **Date:** 2026-07-14

## 1. Overview

The GSPL canonical core is the smallest deterministic, extensible, language-neutral representation from which GSPL can reconstruct programs, architectures, artifacts, and future domain outputs.

### 1.1 Normative Rules

**GSPL-CORE-001:** A canonical seed MUST be representable as bytes that are identical across all platforms.
**GSPL-CORE-002:** The canonical hash MUST use SHA-256 (FIPS 180-4).
**GSPL-CORE-003:** Canonical normalization MUST use JSON Canonicalization Scheme (JCS, RFC 8785).
**GSPL-CORE-004:** Field ordering within canonical objects MUST be lexicographic by key.
**GSPL-CORE-005:** Numeric values MUST be serialized in shortest round-trippable form.
**GSPL-CORE-006:** Unicode strings MUST be normalized to NFKC before canonicalization.
**GSPL-CORE-007:** Binary data in canonical form MUST use base64url encoding.
**GSPL-CORE-008:** Wall-clock timestamps MUST NOT appear in hash-material fields; they are restricted to NON_HASHED metadata.
**GSPL-CORE-009:** Negative zero MUST be normalized to positive zero.
**GSPL-CORE-010:** The content identity (contentId) is DERIVED from HASHED fields and excluded from hash computation.

### 1.2 Implementation Mapping

| Rule | Symbol | Test Reference |
|------|--------|---------------|
| GSPL-CORE-001 | canonicalizeSeed() | seed-ops.ts |
| GSPL-CORE-002 | computeSeedHash() | seed-ops.ts |
| GSPL-CORE-003 | normalizeSeed() | seed-ops.ts |
| GSPL-CORE-008 | HASH_POLICY | seed-ops.ts |
| GSPL-CORE-010 | extractCanonicalHashMaterial() | seed-ops.ts |

### 1.3 Representation Stack



Each layer has a defined schema contract, validation rules, and deterministic transformation rules.
