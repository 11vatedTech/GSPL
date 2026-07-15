# Reconstruction Independence

**Status:** ACCEPTED

**Date:** 2026-07-14

**Context:** Reconstructor was copying fields from original seed, invalidating round-trip proof.

**Decision:** Reconstructor must not accept original seed. All fields reconstructed from IR metadata nodes. Two-pass gene lifting for cross-references.

**Consequences:** Canonical seed round-trip is independently verifiable from IR alone.

**Implementation:** See packages/ for corresponding source.

**Tests:** See packages/*/test/ for test coverage.
