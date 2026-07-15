# GSPL Gene Protocol

**Version:** 1.0 | **Package:** @gspl/gene-protocol

## 1. Overview

The gene protocol defines an extensible, versioned registry of gene types. Replaces the fixed 17-gene-type inventory with a protocol-driven approach.

### 1.1 Normative Rules

**GSPL-GENE-001:** Every gene type MUST have a stable typeId.
**GSPL-GENE-002:** Every gene type MUST declare a valueSchema for validation.
**GSPL-GENE-003:** Every gene type MUST provide canonicalize() for deterministic serialization.
**GSPL-GENE-004:** Every CORE gene type MUST provide lowerToIr() for IR lowering.
**GSPL-GENE-005:** Every CORE gene type SHOULD provide liftFromIr() for IR reconstruction.
**GSPL-GENE-006:** The standard registry MUST be immutable at runtime.
**GSPL-GENE-007:** Gene type descriptors MUST be frozen to prevent mutation.
**GSPL-GENE-008:** Unknown gene types in a seed MUST produce a diagnostic error.

### 1.2 Gene Type Classification

| Classification | Count | Types |
|----------------|-------|-------|
| FUNDAMENTAL_VALUE_KIND | 6 | scalar, categorical, symbolic, vector, temporal, dimensional |
| COMPOSITE_STRUCTURE | 2 | struct, array |
| GRAPH_STRUCTURE | 2 | graph, topology |
| OPERATOR_OR_RULE | 2 | expression, regulatory |
| DOMAIN_SPECIFIC_LIBRARY_TYPE | 4 | field, quantum, gematria, resonance |
| SECURITY_PRIMITIVE | 1 | sovereignty |

### 1.3 Implementation

- Package: @gspl/gene-protocol
- Descriptors: src/defaults.ts (createStandardGeneRegistry)
- Classification: src/dispositions.ts (RECOVERED_GENE_DISPOSITIONS)
- Registry: src/registry.ts (createImmutableRegistry)
