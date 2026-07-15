# GSPL Scope and Non-Goals

## 1. In Scope (canon's responsibility)

* **GSPL language** — lexer, parser, type checker, optimizer, kernel binder.
* **UniversalSeed canonical representation** — schema, invariants, validation.
* **Canonicalization and hashing** — RFC 8785 (JCS) + GSPL field ordering; SHA-256 content addressing.
* **Sovereignty** — ECDSA P-256 deterministic signing per RFC 6979; lineage as first-class.
* **Gene system** — INITIAL 17-type inventory plus extensibility protocol (ADR-0004).
* **Kernel** — xoshiro256** + SplitMix64 + Box-Muller + FNV-1a; 8-phase tick cycle; 8-effect system; Fisher-seed-manifold.
* **Translation bridge** — language↔seed and format↔seed conversion with explicit fidelity levels (ADR-0007).
* **Compiler / runtime scaffolding** — canonical seed → target projection.
* **Package model** — `.gseed` binary (spec/06); `.gspl` source; `.gcapsule`, `.gworld`, `.gresonance` extensions.
* **Conformance system** — claim classification, provenance checks, reference indexing, offline audits.
* **Architectural guardrails** — invariants inherited by every layer.

## 2. Out of Scope (downstream)

* **GSPL Studio** — GUI authoring surface.
* **GSPL Sprites** — sprite-domain consumer.
* **GSPL Marketplace** — seed-trading surface.
* **Federated services** — identity, matchmaking, leaderboards, packages, moderation, governance.
* **Specific engine integrations**.

## 3. Forbidden Goals

* Universal lossless compression of arbitrary data.
* Bit-identical translation across all paradigms.
* AI-from-text as the canonical path to seeds (LLMs admitted only at agent layer).
* Closed gene-type registries.
* Closed domain registries.
* Authority over artistic merit.

## 4. Forbidden Behaviors in Canon Implementations

* `Math.random()` or non-deterministic randomness in pipeline code (other than ECDSA nonces).
* Locale-dependent APIs (locale-aware sort, `toLocaleLowerCase`, locale-aware number formatting).
* Mutable global state in the kernel or pipeline.
* External network I/O during seed determinism.
* Wall-clock time as input to deterministic operations.

These are documented in spec/07-determinism.md and enforced by the canon's lint rules (CI).

## 5. Reserved for Research

* MAP-Elites over non-Euclidean seed distance.
* Adaptive knowledge bases per expansion.
* Cross-engine parity confidence scoring.
* Grammar-guided generative composition beyond gene operators.
* Wave-function-style superpositions over engine versions.
* Power-of-2 jump-ahead variants for parallel evolution.

These belong in forthcoming `docs/research/` and are tracked in `GSPL_RESEARCH_QUESTIONS.md`.

## 6. Boundary Enforcement

The boundary is enforced by package structure:

```
/canon/                     — pure canon data
/packages/canon-foundation/ — universal-seed, JCS, SHA-256, RNG, tick cycle, 7-axis
/tools/reference-indexer/   — canon-side evidence tooling
/tools/provenance-checker/  — canon-side metadata tooling
/tools/claim-classifier/    — canon-side claim-classification tooling
/tests/                     — canon tests
/docs/canon/                — canon documents
/docs/audit/                — reference-repo audit (canon-side)
/canon/provenance/          — inventions, sources, claims, decisions
```

Anything that wants to import from a downstream consumer is doing something wrong; the canon has no knowledge of its consumers. Reference repository content lives under `reference-manifest/` and is excluded from the build.
