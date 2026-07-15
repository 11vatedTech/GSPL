# GSPL IR Specification

**Version:** 1.0 | **Schema:** gspl.ir-graph v1.0

## 1. IR Model

The GSPL IR is a typed, attributed, directed, multi-edge graph with region-based organization.

### 1.1 Normative Rules

**GSPL-IR-001:** The IR MUST be a typed attributed graph with 15 node kinds and 11 edge kinds.
**GSPL-IR-002:** Graph normalization MUST produce a deterministic ordering (nodes by ID, edges by from/to/kind).
**GSPL-IR-003:** The normalization hash MUST use SHA-256 over a deterministic serialization.
**GSPL-IR-004:** Wall-clock timestamps MUST NOT be included in hash-relevant metadata.
**GSPL-IR-005:** Graph structure validation MUST detect orphan nodes, dangling edges, and invalid regions.
**GSPL-IR-006:** Every IR node MUST carry a provenance chain.
**GSPL-IR-007:** Reconstructed seeds from IR MUST preserve canonical byte equality with the original.

### 1.2 Node Kinds

value, gene, constraint, invariant, capability, effect, dependency, reference, region, target, entropy-channel, resource-budget, provenance, diagnostic, extension

### 1.3 Implementation

- Package: @gspl/ir-model
- Schema: src/graph.ts
- Operations: src/graph-ops.ts
- Normalization: normalizeGraph(), computeGraphHash()
