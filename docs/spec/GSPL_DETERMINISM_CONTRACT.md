# GSPL Determinism Contract

**Version:** 1.0 | **Status:** PROMPT-2

## 1. Determinism Guarantees

GSPL guarantees that identical canonical seeds produce byte-identical outputs across all platforms and runtime contexts.

### 1.1 Normative Rules

**GSPL-DET-001:** The same seed content MUST produce identical canonical bytes on all platforms.
**GSPL-DET-002:** Entropy MUST be derived from the seed through deterministic, labeled channels.
**GSPL-DET-003:** Entropy channels MUST be order-independent for cross-process reproducibility.
**GSPL-DET-004:** No Math.random(), wall-clock time, or process-specific entropy MUST be used in canonical computation.
**GSPL-DET-005:** The canonical hash MUST include all HASHED fields.
**GSPL-DET-006:** Changing a NON_HASHED field MUST NOT change the content hash.
**GSPL-DET-007:** Golden vectors MUST be committed and verified for entropy channels and hashing.
**GSPL-DET-008:** Iteration order over object properties MUST be deterministic (sorted keys).

### 1.2 Entropy Channel Golden Vectors

Algorithm: SplitMix64 v1.0

| Seed | Channel | Count | Expected (hex) |
|------|---------|-------|---------------|
| 0 | (root) | 0 | 0 |
| 1 | (root) | 1 | (verified in entropy-channels.test.ts) |
| 42 | (root) | 1 | (verified) |
| 42 | architecture | 1 | (verified) |

### 1.3 Implementation

- Package: @gspl/canon-foundation
- RNG: src/rng/deterministic.ts (SplitMix64)
- Entropy: src/rng/entropy-channels.ts (hierarchical forks)
- Hash: src/hash/sha256.ts
- Canonicalize: src/canonicalize/jcs.ts
