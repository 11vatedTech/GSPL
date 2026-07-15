# GSPL Success Criteria

**Status:** Canonical. Modifications require GID + ADR.

A criterion is PASS when the measured value is at or beyond the threshold, FAIL otherwise.

## 1. Acceptance Criteria

| ID | Metric | Target | Source |
|---|---|---|---|
| SC-001 | Seed-to-artifact expansion ratio, p99 across 100 representative seeds | ≥ 5× procedural; ≥ 2× general | founding thesis |
| SC-002 | Determinism across x86_64, ARM64, RISC-V over 1000 seeds | 100% byte equality | spec/07 (CRITICAL) |
| SC-003 | Self-replay determinism | 100% byte equality | spec/07 |
| SC-004 | Mutation determinism | 100% byte equality | spec/07 |
| SC-005 | Cross-engine parity across 8 canonical engine targets | 100% within tolerance bands; 0 untyped waivers | MVP_DEFINITION Part 4 |
| SC-006 | Reference-indexer determinism | 100% byte equality | gspl-canon tooling |
| SC-007 | Provenance-checker CI gate | 0 errors; <5 warnings | gspl-canon tooling |
| SC-008 | Claim-classifier evidence enforcement | 0 violations | gspl-canon tooling |
| SC-009 | Cross-language reproduction (e.g., Rust re-implementation) | 100% byte equality | spec/07 |
| SC-010 | Lineage traceability from descendant to primordials | 100% reachable | spec/05 |
| SC-011 | Sovereignty verification of every published seed | 100% verified | spec/05 |
| SC-012 | Hash correctness: every seed's `$hash` matches canonicalization | 100% | spec/01 |
| SC-013 | 7-axis structural compliance: every gseed, CLI, editor, export, test | 100% | MVP_DEFINITION Part 7 |
| SC-014 | Translation-fidelity graduation typed on every conversion | 100% typed | GSPL_TRANSLATION_BRIDGE_MODEL |
| SC-015 | Reference-game roundtrip: 12 Tier-E recipes seed-only playable | 12/12 | MVP_DEFINITION Tier E |
| SC-016 | Royalty propagation auditable reproducibility | 100% reproducible | spec/05 |

## 2. Failure Conditions

The canon FAILS if any of:

* generated code cannot be effectively maintained by a human author.
* seed output changes between successive runs of the same compiler knowledge.
* translations silently change program behavior.
* seeds depend on undocumented external knowledge.
* system only works through opaque model inference.
* reproducibility cannot be guaranteed.
* seed descriptions become as large as the source they replace.
* debugging requires inspecting megabytes without seed-level tooling.
* architecture quality is inferior to direct implementation.
* security boundaries are lost during synthesis.

Bind each to specific tests in `tests/` and to specific SC-0XX rows.

## 3. Status Mapping

| Status | Condition |
|---|---|
| **PROVEN** | All SC-001..SC-016 measured with reproducible evidence. |
| **IMPLEMENTED** | Canonical surface meets the criterion under full integration test. |
| **PARTIALLY_IMPLEMENTED** | Some surfaces meet criterion; failures typed and bounded. |
| **PROTOTYPED** | ≥1 reference implementation demonstrates criterion; coverage not measured. |
| **THEORETICAL** | Criterion articulated, no implementation demonstrates it. |
| **RESEARCH_REQUIRED** | Active research; status may resolve with caveats. |
| **UNSUPPORTED** | Challenger raised no defense yet. |
| **REFUTED** | Adversarial demonstration produced the criterion's negation. |

`GSPL-CLAIM-0001` target: **IMPLEMENTED** after SC-001, SC-002, SC-003, SC-009 validated end-to-end on a corpus of 100+ seeds.

## 4. SC-002 is Decisive

Cross-architecture determinism is the load-bearing criterion. If a seed produces different bytes on x86_64 vs ARM64, every AVX-vs-NEON edge case breaks lineage, sovereignty, royalties, and the entire determinism claim. SC-002 will be tested in CI from P3 onward. A failure is P0 blocker.

## 5. Acceptance Cadence

* Every ADR carries the SC-IDs it is bound to.
* Every test carries the SC-IDs it validates.
* Every release is gated by the SC-IDs the release claims.
