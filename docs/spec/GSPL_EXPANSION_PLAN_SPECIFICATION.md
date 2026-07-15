# GSPL Expansion Plan Specification

**Version:** 1.0 | **Schema:** gspl.expansion-plan v1.0

## 1. Normative Rules

**GSPL-PLAN-001:** Every expansion plan MUST enumerate operations with deterministic IDs.
**GSPL-PLAN-002:** Operation dependencies MUST form a directed acyclic graph.
**GSPL-PLAN-003:** Parallel groups MUST be derived from dependency independence.
**GSPL-PLAN-004:** Cache keys MUST be content-addressed (SHA-256 over operation inputs).
**GSPL-PLAN-005:** Failure policy MUST be declared (halt, skip, or degrade).
**GSPL-PLAN-006:** Resource budgets MUST be checked before and during execution.
**GSPL-PLAN-007:** Every step MUST produce a verification rule.
**GSPL-PLAN-008:** An empty IR for a nonempty seed MUST produce a diagnostic (GSPL-PIPE-EMPTY-IR).

## 2. Implementation

- Package: @gspl/compiler-core
- Schema: src/expansion-plan.ts
- Planner: src/pipeline.ts (stageIrToPlan)
