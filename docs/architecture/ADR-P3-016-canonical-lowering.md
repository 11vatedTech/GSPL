# ADR-P3-016: Canonical Lowering

**Status**: ACCEPTED | **Prompt 3 §16**

## Context
Textual GSPL must lower deterministically to the Prompt 2 canonical seed model without silently losing authored information.

## Decision
Unknown types are fatal errors (no GS-001 fallback). All authored fields from constraints, entropy, effects, budgets, and targets are lowered to canonical fields. Content identity is computed via Prompt 2 canonicalizeSeed. Desugaring and normalization traces are recorded.

## Consequences
- Author intent is preserved through lowering
- Fatal errors prevent invalid canonical output
- Prompt 2 API reuse avoids duplication
