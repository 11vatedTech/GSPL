# GSPL Compression Boundaries

**Status:** Canonical. Modifications require GID + ADR.

## Rule

> A seed's expansion ratio is determined by the regenerability class of the artifact, the size of the compiler knowledge base named by the seed's metadata, and the cost of producing the target output. The maximum is bounded by these factors; not by compression of arbitrary data.

## 1. The 8 rebuild classes

| ID | Mechanism | Legitimate expansion | Boundary |
|---|---|---|---|
| RC-1 | Procedural systems | 100×–10,000× terrain, levels, textures | procedural rules finite |
| RC-2 | Parametric assets | 10×–100× art assets | parametric description finite |
| RC-3 | Repeated structures (CA, fractals, grammars) | 100×–∞ theoretical; practical 100,000× | termination conditions explicit |
| RC-4 | Code from reusable architectures | 5×–50× typical apps | architecture reusable across instances |
| RC-5 | Domain libraries referenced by content hash | N/A — seed references, not contains | library named externally |
| RC-6 | Language-neutral architecture vs N target syntaxes | 2×–10× typical cross-language | target languages enumerable |
| RC-7 | Content-addressed deduplication | N/A — data referenced | reference targets retrievable |
| RC-8 | Shared compiler knowledge | engine, runtime, libraries are part of the equation | compiler version named explicitly |

RC-1..RC-4 are **regenerative** (output constructed from rules).
RC-5, RC-6, RC-7 are **referential** (output referenced).
RC-8 is **compiler-bound**.

## 2. What GSPL is NOT

* an arbitrary compressor of incompressible data;
* a neural codec (no implicit learning as compression oracle);
* a Zip competitor;
* a hallucination tool.

## 3. Why arbitrary incompressible data cannot be reduced

Kolmogorov complexity of a uniformly random 1 GB byte stream: ≈ 1 GB expected. **No description shorter than the data can in expectation reproduce it.**

## 4. The legitimate claim

> GSPL achieves high expansion ratios when the output's regenerability class is favorable (RC-1..RC-4) and is content-addressed / referentially efficient when the output is genuinely new. It is NOT a general-purpose compressor.

This is the canonical claim. The universal-compression framing is REFUTED.

## 5. Expansion-ratio measurement protocol

For each new seed in the test corpus:

1. Classify by regenerability class(es).
2. Measure byte length of `$metadata` AND size of referenced KB.
3. Measure byte size of produced target.
4. Compute `target / (seed + KB)`.
5. Validate determinism: same byte size.
6. Validate SC-001 target.

## 6. Adversarial corpus

The canon maintains an **adversarial compression corpus**:

* a 1 GB random byte file (K-1).
* a 1 MB irreducibly-written microgame.
* a 100 KB photograph.
* a 50 GB binary corpus.

For each, expansion-ratio ≤ 1.05 is expected. If significantly higher, the pipeline has a bug, not the canon.

## 7. Decision

This document binds to ADR-0008. The "universal compression" claim is **REFUTED** in `canon/provenance/claims.json`.
