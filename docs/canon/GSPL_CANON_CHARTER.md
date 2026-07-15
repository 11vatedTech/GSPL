# GSPL Canon Charter

**Status:** Provisional canonical charter (Prompt 1 deliverable).

This is NOT the GSPL language specification. It is the short, evidence-grounded foundation that the spec, compiler, language, runtime, and translation bridge are built on top of.

## 1. The Founder's Original Problem

> Why should entire codebases, systems, and digital artifacts be explicitly authored and stored when they may instead be reproducibly generated from compact seeds?

Recovered from `PAradigm-reference-main/spec/00-overview.md` and `Paradigm_GSPL_OS-main/README.md`. See `GSPL_FOUNDING_THESIS.md` for full context.

## 2. The Seed-First Programming Thesis

A compact artifact-addressable description, deterministically expanded by a stable compiler, reproducibly regenerates the larger structured output. The seed is **primary**. Source code, files, and assets are **projections**.

Recorded as claim `GSPL-CLAIM-0001`, current status **PROTOTYPED**, target **IMPLEMENTED** per `GSPL_SUCCESS_CRITERIA.md`.

## 3. Source Code as Projection

> Source code is one projection of a canonical program representation. Files, assets, build scripts, documentation, and tests are also projections, derivable from the same canonical representation under target-specific projectors.

Source code is NOT refuted; it remains the dominant authoring surface and distribution format. The canon's claim is that within GSPL, source code is no longer the canonical representation — the seed is. See ADR-0002.

## 4. Deterministic Generation and Reproducibility

A seed runs through an 8-phase tick cycle that depends only on:

* the seed's content hash (deterministic RNG key);
* the compiler knowledge version (`$metadata.engine_version`);
* the context (libraries referenced by `$hash`);
* the target contract.

Any divergence is treated as a bug of the highest severity. See spec/07-determinism.md and `GSPL_RESEARCH_QUESTIONS.md`.

## 5. Truthful Limits on Compression

GSPL does NOT claim universal compression of unrelated terabytes into kilobytes. Legitimate expansion mechanisms (RC-1..RC-8) are listed in `GSPL_COMPRESSION_BOUNDARIES.md`. The canon's claim is **a defensible substrate for the cases where compression actually works**, not a universal compressor.

## 6. Relationship to Domain Products

The canon concerns GSPL itself: language, seed model, canonical representation, compiler, translation bridge, runtime, package model, conformance.

**GSPL Sprites, GSPL Studio, Marketplace, federated services, and other domain products live in separate repositories and are explicitly out of scope.**

## 7. Non-Goals

* Universal lossless compression of arbitrary data.
* Plausible deniability for AI-generated content.
* Replacement of all programming languages.
* Replacement for game engines, image editors, or any domain-specific tool.
* Authority over the cultural meaning of generated artifacts.
* Closed gene-type registries.
* Closed domain registries.

## 8. Unresolved Questions (forwarded to Prompt 2)

* Is the 17-gene-type inventory provably irreducible, or just empirically arrived at? (RQ-001)
* Does the typed-semantic-graph subsume the typed-genome model without loss? (RQ-003)
* Cross-architecture determinism recovery (RQ-006, RQ-007)
* Seven-axis partial-compliance test (RQ-008, RQ-021)
* Provenance-defended knowledge-base scope (RQ-002, RQ-012)

## 9. Authority & Modifications

This charter binds the canon. Modifications require a GID document under `docs/canon/decisions/` and an ADR under `canon/decisions/`. Silent changes are forbidden by the provenance checker's CI gate.

## Cross-references

* Founding thesis: `docs/canon/GSPL_FOUNDING_THESIS.md`
* First-principles derivation: `docs/canon/GSPL_FIRST_PRINCIPLES.md`
* Scope: `docs/canon/GSPL_SCOPE_AND_NON_GOALS.md`
* Research: `docs/canon/GSPL_RESEARCH_QUESTIONS.md`
* Success: `docs/canon/GSPL_SUCCESS_CRITERIA.md`
* Compression: `docs/canon/GSPL_COMPRESSION_BOUNDARIES.md`
* Translation: `docs/canon/GSPL_TRANSLATION_BRIDGE_MODEL.md`
* Seed-model comparison: `docs/canon/GSPL_SEED_MODEL_CANDIDATES.md`
