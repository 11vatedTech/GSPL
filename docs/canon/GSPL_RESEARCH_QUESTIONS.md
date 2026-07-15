# GSPL Research Questions

**Status:** Active. Each question maps to an engineering experiment.

| ID | Question | Engineering metric | Prompt target |
|---|---|---|---|
| RQ-001 | Is the 17-gene-type inventory provably irreducible? | Construct an 18th-type case; evaluate typed-struct composition. | P2 (ADR-0004) |
| RQ-002 | Minimum knowledge-base scope for offline reproduction across 8 engine targets? | KB tarball size per engine; rank-of-essentiality audit. | P3 (ADR-0009) |
| RQ-003 | Does the typed-semantic-graph subsume the typed-genome without loss? | Round-trip mapping of every spec/01 gene type to a graph node class. | P2 (ADR-0005) |
| RQ-004 | Cross-encoder parity: 60 fixtures × 8 engines. | Parity matrix. | P4 |
| RQ-005 | Seed-to-artifact expansion ratio in worst case. | Measure on 100 representative seeds. | P6 |
| RQ-006 | xoshiro256** bit-identical across ARM64, x86_64, RISC-V. | Cross-architecture CI matrix. | P3 (SC-002) |
| RQ-007 | Linear cross-engine parity recovery when float accumulators differ. | Parity waiver system with typed tolerance bands. | P4 |
| RQ-008 | 7-axis drop test: drop one axis intentionally, record breakage cascade. | Reverse experiment. | P5 |
| RQ-009 | Smallest canonical projection that produces a complete production game from one recipe (Tier E). | Reference-game roundtrip + reassembly-by-seed. | P6 |
| RQ-010 | Lineage scalability under 10,000+ generation evolution. | Ancestry-graph diameter at fixed fitness thresholds. | P6 |
| RQ-011 | Mutation + crossover operator composition across 26 domains without degeneracy. | MAP-Elites archive coverage metrics. | P6 |
| RQ-012 | Defense against supply-chain injection via tampered knowledge base. | Adversarial test corpus. | P7 |
| RQ-013 | Agent translation of NL intent to verified canonical seed without breaking determinism. | End-to-end agent replay on fixed NL corpus. | P5 |
| RQ-014 | Maximum recoverable expansion ratio at p99 confidence against arbitrary inputs. | Compression benchmark + Kolmogorov complexity analog. | P6 |
| RQ-015 | Does the 8-effect system cover all kernel-side effects needed by 26-domain engines? | Exhaustion proof. | P3 |
| RQ-016 | Cross-language re-implementation (e.g., Rust) bit-identical results. | Cross-language parity matrix. | P8 |
| RQ-017 | Cost of removing the Fisher Information seed-manifold in favor of simpler edit distance. | Speed/quality tradeoff benchmark. | P4 |
| RQ-018 | Sovereignty subsystem survival of key loss events in federated networks. | Recovery protocol experiment. | P8 |
| RQ-019 | Kernel scalability to 26 simultaneous running engine targets without scheduler reordering. | Deterministic multithread replay on heavy fixture. | P3 |
| RQ-020 | `@gpu` WGSL annotation wire-equivalence to portable shader subset. | Parity test against WebGPU implementations. | P4 |
| RQ-021 | 7-axis partial-compliance test. | Per-axis partial compliance matrix. | P5 |
| RQ-022 | Deterministic reconstruction of a partially-canonical seed (some fields missing). | Reconstruction algorithm benchmark. | P5 |

## Cadence

* Question resolution triggers a GID document + ADR + claim-status update.
* Each question's resolution is itself auditable: it cannot move a claim above PROTOTYPED without producing reproducible evidence.

## Citation provenance

The 22 questions trace to:
* `MVP_DEFINITION.md` Parts 3, 4, 7 (9 questions)
* `spec/03-kernel.md` (3 questions)
* `spec/07-determinism.md` (4 questions)
* `spec/02-gene-system.md` (3 questions)
* `PAradigm-reference-main/GLOSSARY.md` (3 questions)
