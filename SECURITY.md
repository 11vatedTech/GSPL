# Security Model

GSPL inherits a security model from three layers.

## 1. Identity (sovereignty)

Every seed carries the canonical content hash - the SHA-256 of its JCS-canonical bytes (with hash field and lineage.timestamp excluded). Hash is signed with ECDSA P-256 using RFC 6979 deterministic nonces, so signatures are reproducible without external entropy.

Reference: packages/canon-foundation/src/hash/sha256.ts and spec/05-sovereignty.md.

## 2. Determinism (reproducibility)

A canonical seed plus matching compiler knowledge plus same context equals same artifact. SC-002 cross-architecture parity (x86_64 / ARM64 / RISC-V) is the decisive criterion; failure is P0 blocker.

Reference: packages/canon-foundation/src/rng/deterministic.ts and spec/07-determinism.md.

## 3. Supply-chain (knowledge base governance)

The seed references compiler knowledge by content hash. The knowledge base must be content-addressed (SHA-256 over its bytes), signed (ECDSA P-256 over its content hash), versioned (the seed metadata pins the engine version), and recoverable (a federation may store or cache it, but offline operation requires local storage).

## 4. Typosquat avoidance

The canon CLI uses exact repo paths supplied by configuration. NEVER machine-default paths. The reference-indexer has fixed EXCLUDED_DIRS and EXCLUDED_BASENAMES policies.

Reference: tools/reference-indexer/src/policy.ts.

## Reporting

If you discover a vulnerability, file a GID under docs/canon/decisions/ and an issue in the canonical tracker.
