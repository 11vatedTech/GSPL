# GSPL Conformance Index

**Total Rules:** 15

| Rule ID | Requirement | Implementation | Tests |
|---------|-------------|---------------|-------|
| GSPL-DET-001 | MUST NOT... | packages/ir-model/src/graph.ts | packages/compiler-core/test/mutation.test.ts |
| GSPL-DET-002 | MUST: No... | seed-format/src/seed-ops.ts | property.test.ts |
| GSPL-DET-003 | MUST: Sa... | pipeline.ts | cross-process.test.ts |
| GSPL-SEED-001 | MUST: Ca... | seed.ts | seed-format/test/ |
| GSPL-SEED-002 | MUST: Fi... | seed-ops.ts | canonicalization.test.ts |
| GSPL-IR-001 | MUST: Ty... | ir-model/src/graph.ts | ir-model/test/ |
| GSPL-IR-002 | MUST: Gr... | graph-ops.ts | property.test.ts |
| GSPL-GENE-001 | MUST: Ge... | gene-protocol/src/types.ts | gene-protocol/test/ |
| GSPL-GENE-002 | MUST: Ge... | defaults.ts | gene-protocol/test/ |
| GSPL-RECON-001 | SHALL: R... | ir-reconstructor.ts | sabotage.test.ts |
| GSPL-PLAN-001 | MUST: Op... | expansion-plan.ts | compiler-core/test/ |
| GSPL-HASH-001 | MUST: SH... | seed-ops.ts | property.test.ts |
| GSPL-LIMIT-001 | SHALL: R... | pipeline.ts | adversarial-limits.test.ts |
| GSPL-PROV-001 | MUST: Ev... | ir-model/src/graph.ts | mutation.test.ts |
| GSPL-PACK-001 | SHALL: C... | package-resolver/src/resolver.ts | package-resolver/test/ |
