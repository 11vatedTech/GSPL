# Contributing to GSPL Canon

This repository is the canonical foundation. Contributors must follow the canon governance rules.

## Workflow

1. Create an issue or branch in your downstream repo.
2. If your change touches the canon (definitions, artifacts, types):
   - Add a new entry in canon/provenance/inventions.json with stable id GSPL-INV-####.
   - Add an ADR in docs/canon/decisions/ADR-####.md.
   - Update the matching claim in canon/provenance/claims.json with evidence.
3. Run npm run validate. CI fails if a new invention ID is malformed, a new invention has no source, a non-THEORETICAL claim has no evidence, or the canon-foundation package fails typecheck.
4. Sign your commits with sovereign ECDSA P-256 signatures (RFC 6979) when finalized.

## Adding gene types

Gene types are EXTENSIBLE per docs/canon/GSPL_FIRST_PRINCIPLES.md. Adding one is a major canon event:

1. Update packages/canon-foundation/src/types/gene-types.ts.
2. Add per-type operators in tests.
3. Write an ADR in docs/canon/decisions/.
4. Update canon/provenance/inventions.json to bump the gene-type count.

## Reference repos

NEVER modify files in Reference-repos_and_planning/. They are evidence only.

## Style

- TypeScript strict:true; no any in canon code.
- JCS-style canonicalization for any seeded data.
- 8 invariants per spec/01 for seed validity.
- Determinism-first; no Math.random(), no Date.now() in expansion paths.
