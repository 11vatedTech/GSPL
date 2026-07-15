# GSPL Diagnostics Specification

**Version:** 1.0 | **Package:** @gspl/ir-model

## 1. Normative Rules

**GSPL-DIAG-001:** Every diagnostic MUST have a unique code, severity, and category.
**GSPL-DIAG-002:** Twenty diagnostic categories are defined: SCHEMA, TYPE, REFERENCE, CONSTRAINT, INVARIANT, CAPABILITY, EFFECT, DETERMINISM, CANONICALIZATION, HASH, GRAPH, CYCLE, RESOURCE, VERSION, MIGRATION, SECURITY, PROVENANCE, TARGET, EXTENSION, INTERNAL.
**GSPL-DIAG-003:** Four severity levels: error, warning, info, hint.
**GSPL-DIAG-004:** Pipeline diagnostics MUST include GSPL-PIPE-EMPTY-IR, GSPL-PIPE-EMPTY-PLAN, GSPL-PIPE-EMPTY-ARTIFACT-GRAPH.
**GSPL-DIAG-005:** Effect denial MUST produce GSPL-EFFECT-DENIED.
**GSPL-DIAG-006:** Missing provenance MUST produce GSPL-PROV-MISSING.
**GSPL-DIAG-007:** Budget exceeded MUST produce GSPL-BUDGET-EXCEEDED.

## 2. Implementation

- Package: @gspl/ir-model
- Types: src/diagnostics.ts
- Verifier: @gspl/compiler-core/src/semantic-verifier.ts
