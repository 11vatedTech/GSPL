# GSPL Seed Model Candidates

**Status:** Provisional canonical comparison.

## Candidate A — Genome Model (recovered from spec/01)

```
Seed
└── Genome
    ├── $gst
    ├── $domain
    ├── $lineage
    └── genes: Map<gene-name, {type, value}>
```

## Candidate B — Typed Semantic Graph

```
Seed
└── Typed Semantic Graph
    ├── Nodes (typed)
    ├── Edges (typed)
    ├── Constraints
    └── Transformations
```

## Candidate C — Generative Program

```
Seed
└── Generative Program
    ├── Parameters
    ├── Rules
    ├── Dependencies
    ├── Invariants
    └── Targets
```

## Comparison axes

Per Prompt 1 Section 12. Models scored 1-10.

| Axis | A | B | C | Weight |
|---|---|---|---|---|
| Expressive power | 7 | 9 | 8 | high |
| Determinism | 10 | 5 | 7 | critical |
| Extensibility | 6 | 9 | 9 | high |
| Translation fidelity | 8 | 8 | 8 | high |
| Architecture synthesis | 4 | 9 | 8 | medium |
| Compression potential | 5 | 6 | 8 | medium |
| Debuggability | 5 | 6 | 5 | medium |
| Verifiability | 9 | 6 | 6 | high |
| Incremental compilation | 7 | 5 | 7 | medium |
| Runtime cost | 9 | 5 | 6 | high |
| Human authorability | 6 | 4 | 4 | high |
| Machine authorability | 7 | 8 | 8 | medium |
| Cross-domain applicability | 8 | 8 | 9 | high |
| Security | 8 | 6 | 6 | high |
| Long-term evolution | 6 | 8 | 7 | medium |

Aggregate (max 140): A=99, B=96, C=100.

## Principled hybrid

Canonical form is A (Genome). Internally, every seed is also a Typed Semantic Graph (B). External libraries may publish Generative Program rules (C) that act on top of canonical seeds. Rules are NOT canonical content; they are external knowledge.

The hybrid binds to ADR-0005.

## Decision

**GSPL-DEC-0001:** Canonical seed = Genome Model (A) + internal Typed Semantic Graph view (B) + external Generative Program rules (C). The 17 gene types remain INITIAL INVENTORY (ADR-0004), not a closed set.

Forwarded to RQ-003 (typed-semantic-graph subsuming typed-genome?) and RQ-022 (partial-canonical-seed reconstruction).
