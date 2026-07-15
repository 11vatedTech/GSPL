# GSPL Reproducibility Claims (Prompt 2 §15)

## What the canon may claim today

> GSPL's current canonical reference fixtures are reproducible across the tested Windows/Linux and Node 20/22 matrix under explicitly locked compiler, package, and canonicalization inputs.

## Scope of the claim

- **Operating systems tested**: `ubuntu-latest` and `windows-latest`.
- **Node versions tested**: Node 20 LTS and Node 22 LTS.
- **Compiler + canon versions**: `COMPILER_VERSION = 0.1.0`, `CANON_VERSION = 1.0`.
- **Gene registry**: `createStandardGeneRegistry()` from `@gspl/gene-protocol`.
- **Package lock**: synthesized from `seed.dependencies`.
- **Fixtures**: 5 — `software-architecture`, `interactive-scene`, `mixed-video-game`, `package-backed`, `gene-extension`.
- **Reconstruction mode**: `CANONICAL_ENVELOPE_RECONSTRUCTION` (byte-equal round-trip).

## What the canon must NOT claim

- Universal hardware reproducibility.
- Universal target-language reproducibility.
- Reproducibility across untested runtimes.
- Behavioral equivalence of arbitrary generated programs.
- Reproducible model inference.
- That GSPL invented reproducibility itself.

## Claim ledger

| ID | Scope | Status |
|---|---|---|
| GSPL-REP-1 | 5 fixtures x 2 OS x 2 Node byte-equal canonical output | PROVISIONAL (matrix evidence) |
| GSPL-REP-2 | 5 fixtures x 1 OS x 2 Node byte-equal canonical output | CONFIRMED (locally) |
| GSPL-REP-3 | Restart reconstruction is a separate process with no fixture import | PROVISIONAL |
| GSPL-REP-4 | Adversarial archive attacks are rejected | PROVISIONAL |
| GSPL-REP-5 | Local source archive byte reproducibility | CONFIRMED (locally) |
