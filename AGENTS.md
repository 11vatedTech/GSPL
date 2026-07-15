# Agent Operating Contract

This document binds AI agents and human contributors working on or with the canon. The rules below are operative.

## Always

- Cite canon documents by file path (docs/canon/GSPL_*.md) when making claims.
- Cite canon inventions by stable id (GSPL-INV-NNNN) when referring to a recoverable concept.
- Cite claims by stable id (GSPL-CLAIM-NNNN) when stating GSPL-side propositions.
- Read the relevant ADR(s) before changing any subsystem: docs/canon/decisions/ADR-NNNN.md.
- Treat reference-manifest/ outputs as evidence, not as code.

## Never

- Modify files in Reference-repos_and_planning/.
- Add new gene types to packages/canon-foundation/src/types/gene-types.ts without writing an ADR.
- Promote a claim above PROTOTYPED without reproducibly cited evidence.
- Introduce non-deterministic randomness in canon-foundation code.

## Workflow expectations

- New canon concepts: inventions.json -> ADR -> claim update -> npm run validate.
- Engine or product work: do it in a downstream repo. Do not import canon-internal modules into a downstream product.
- Documentation updates: maintain the 9 founding docs in lockstep.

## Anti-patterns

- Reading a REFERENCE repo as canonical. Reference repos are EVIDENCE.
- Closing the gene-type registry. The 17 are INITIAL INVENTORY, not closed.
- Replacing the seed with source code. Source code is a projection, not the canonical form (see ADR-0002).
