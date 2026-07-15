# GSPL First-Principles Derivation

**Status:** Provisional. Subject to revision. Reverse-engineered from evidence + first-principles analysis.

This document is the first step of Prompt 1. Repository adoption follows.

---

## 1. Irreducible Components Hypothesis

The first-principles derivation proceeds by asking: *What is the smallest set of components a system needs to defend all three founding claims of `GSPL_FOUNDING_THESIS.md` simultaneously?*

The hypothesis:

```
A seed-first generative substrate requires AT MINIMUM the following
irreducible components:

  1. Intent           — what the artifact should be
  2. Seed             — a finite, addressable, deterministic description
  3. Context          — knowledge external to the seed that the seed references
                        by identifier (libraries, prior seeds, world state)
  4. Knowledge        — domain rules, artistic conventions, artistic grammars
                        that the expansion uses
  5. Constraint       — invariants the expansion must preserve
  6. Identity         — cryptographic authorship / lineage addressability of
                        the seed
  7. Structure        — typed graph / AST / typed-gene graph that the seed
                        carries
  8. Transformation   — operators (mutate, breed, compose, evolve)
  9. Projection       — how the canonical expansion maps to a target
  10. Target          — the destination language / format / medium
  11. Provenance      — the history chain of seeds
  12. Validation      — invariant checks against the 8 invariant
                        (seed-correctness, lineage, sovereignty, etc.)
  13. Execution       — the deterministic runtime that runs the kernel and
                        tick cycle
  14. Compiler        — the projection + expansion machinery
  15. Knowledge Base  — the external shared knowledge (libraries,
                        architectures, prior seeds, world data)
  16. Output          — the produced artifact
```

Sixteen components. Coarse-grained but irreducible.

Adoption question: does any candidate canonical model collapse or eliminate one of these? If so, the model is too weak; reviving the eliminated component must be done by introducing a non-canonical patch, which the canon's traceability rules forbid.

---

## 2. Three Candidate Canonical Models

### Candidate A — Genome Model (recovered from the reference repos)

```
Seed
└── Genome
    ├── $gst
    ├── $domain
    ├── $lineage
    └── genes: Map<gene-name, {type, value}>
```

The Genome Model is the innermost piece of `spec/01-universal-seed.md`. Every other component (compiler, language, kernel) sits *around* the genome.

Strengths:
- The strongest empirical evidence base: a fully specified canonical schema (spec/01) and at least one reference implementation (Paradigm_GSPL_OS kernel).
- Lossless projection: SHA-256 over JCS gives bit-stable identity.
- Composable: 17 gene types with documented operators.

Weaknesses:
- The "gene" abstraction is named after biological metaphors. The metaphor does not always carry engineering meaning — `scalar` is a number, not a "trait"; `quantum` is a probability vector, not a "biological gene."
- The 17 gene types are recovered as an INITIAL INVENTORY but their IRREDUCIBILITY is an empirical claim, not a proof. Adversarial review (Section 4) may surface a counterexample.
- The Genome Model does not directly model Intent or Knowledge (they are external to the seed).

Score (per ADR-0005 criteria):
- Expressive power: 7/10
- Determinism: 10/10
- Extensibility: 6/10 (the gene registry is the boundary; ad-hoc schema composition is foreign to the model)
- Translation fidelity: 8/10
- Architecture synthesis: 4/10 (architecture has to be projected into the gene model; the genome is not architecture-preserving inherently)
- Compression potential: 5/10 (the seed shares space with the kernel/knowledge; the seed alone is not e.g. a neural codec)
- Debuggability: 5/10
- Verifiability: 9/10
- Incremental compilation: 7/10
- Runtime cost: 9/10
- Human authorability: 6/10
- Machine authorability: 7/10
- Cross-domain applicability: 8/10
- Security: 8/10 (sovereignty handled)
- Long-term evolution: 6/10

Aggregate: **88/140**.

### Candidate B — Typed Semantic Graph Model

```
Seed
└── Typed Semantic Graph
    ├── Nodes (typed: function, type, struct, expr, constraint, ref...)
    ├── Edges (typed: calls, depends-on, refines, composes-with...)
    ├── Constraints (per-node invariants)
    ├── Transformations (operator library over the graph)
```

This is closer to a generic IR (think LLVM) than to a gene. Each "gene" is a node class, and the 17-type vocabulary is replaced by an open type system.

Strengths:
- Maximum extensibility: any-node-may-be-defined.
- Composition by graph rewriting is well-developed (BSP, graph transformations, Bigraphs).
- Architecture is first-class (a subgraph IS an architecture).

Weaknesses:
- Determinism by canonical form is HARDER if the graph is open — every node type needs its own canonical form, hash, and operator.
- Higher implementation cost.
- Loses the "gene operator interface" simplicity: every node needs full trait machinery, not a 6-method trait.

Score:
- Expressive power: 9/10
- Determinism: 5/10 (the graph canonicalization problem is harder)
- Extensibility: 9/10
- Translation fidelity: 8/10
- Architecture synthesis: 9/10
- Compression potential: 6/10
- Debuggability: 6/10
- Verifiability: 6/10
- Incremental compilation: 5/10
- Runtime cost: 5/10
- Human authorability: 4/10
- Machine authorability: 8/10
- Cross-domain applicability: 8/10
- Security: 6/10
- Long-term evolution: 8/10

Aggregate: **93/140**.

### Candidate C — Generative Program Model

```
Seed
└── Generative Program
    ├── Parameters (named values, possibly typed)
    ├── Rules (transformations producing intermediate seeds)
    ├── Dependencies (other seeds by $hash / namespace)
    ├── Invariants
    └── Targets (the requested projection(s))
```

This is closer to a configuration-and-rules file (think Nix, Bazel, EYE). The seed carries a list of rules and references; the substrate applies the rules to produce artifacts.

Strengths:
- Maximally close to the "compiler knowledge + seed" hypothesis from the founding thesis.
- Cross-language/cross-format translation is rule-driven.
- Architecture is implicit in the rules.

Weaknesses:
- Rule execution order is a hidden non-determinism source unless pinned.
- Authoring is harder (rules are more expressive than genes but harder to compose correctly).
- The "17 gene types" are not directly recoverable as operators; they appear as "atomic parameters."
- Sovereignty attaches to programs, not parameters — unclear how to extend the seed-author semantic.

Score:
- Expressive power: 8/10
- Determinism: 7/10
- Extensibility: 9/10
- Translation fidelity: 8/10
- Architecture synthesis: 8/10
- Compression potential: 8/10
- Debuggability: 5/10
- Verifiability: 6/10
- Incremental compilation: 7/10
- Runtime cost: 6/10
- Human authorability: 4/10
- Machine authorability: 8/10
- Cross-domain applicability: 9/10
- Security: 6/10
- Long-term evolution: 7/10

Aggregate: **99/140**.

---

## 3. Provisional Selection — Principled Hybrid

The Genome Model wins on **determinism** and **verifiability** (it is the only model with full canonical-form invariants and the only one with a stable seed-only hash). The Generative Program Model wins on **architecture synthesis** and **expressiveness**. The Semantic Graph Model is the strongest general alternative but adds implementation cost.

The provisional hybrid:

```
The canonical-seed substrate is a Typed Genome (Candidate A) wrapped in a
Generative-Program projector (Candidate C). The Canonical Seed carries:

  - The genome (genes map) for typed biological-style operators
  - Parameters (typed) for non-genome values (e.g., engine_version)
  - Rules-free behavior (rules live in the generator, not the seed)
  - Lineage (graph-structured ancestry)
  - Sovereignty (cryptographic identity)

The Typed Semantic Graph Model (Candidate B) is NOT chosen as the canonical
representation, but is recovered as a SECONDARY REPRESENTATION used inside
the kernel and translation bridge. Internally, the substrate may traverse
seeds as semantic graphs; externally, the canonical form is the Genome.
```

The selection lives in `canon/decisions/ADR-0005.md`.

The future-proofing argument: as long as the Genome Model admits the LINES BOUNDARY listed above (Intent, Knowledge, Constraint, etc.), the hybrid is consistent. The Genome Model is the strongest *portable* canonical form. The Generative Program Model is the strongest *execution* form. Stacking them is mandatory.

---

## 4. Hostile Review of the Three Founding Claims

### Claim (Seed-first programming)

> Reproducibility-by-construction — same seed + same compiler knowledge + same context = same artifact forever.

*Attempted disproof:* The claim fails when the "same context" condition is ID-leaky. If regeneration requires a 50 GB body of knowledge that is named by `$metadata.engine_version`, the claim is true only when the knowledge is recoverable. Knowledge versioning IS the seed's reference target. Conclusion: **PROVEN VIABLE** when knowledge version is named explicitly; **REFUTED** otherwise. See ADR-0009.

### Claim (Canonical-projections)

> Architecture, behavior, intent, and constraints survive translation across many target projections.

*Attempted disproof:* Behavior preservation across heterogeneous paradigms is impossible in general — translating manual memory management into a GC'd language does NOT preserve behavior; it changes program semantics. Translation fidelity is graduated, not binary. Conclusion: **VIABLE UNDER EXPLICIT CONDITIONS**. See ADR-0007.

### Claim (Architecture synthesis)

> The seed carries enough structural information to enable cross-domain architecture synthesis.

*Attempted disproof:* If the seed's structural information is gene-local (no global architecture), then architecture must be reconstructed by the kernel — and the kernel does not have structural fidelity to the original human intent. Conclusion: **PARTIALLY VIABLE** — the seed can carry architecture implicitly via `struct`, `graph`, `topology`, and `field` types, but architecture is recoverable only when the seed is built with that intent. See ADR-0001.

---

## 5. Gene-System Without Closed Inventory

The 17 gene types in `spec/02-gene-system.md` are recorded as the **initial inventory**, not as a closed set. The first-principles critique:

* The 17 are claimed empirically irreducible ("Removing any type loses expressiveness in a way that cannot be recovered by composition of the rest"). This is a CLAIM OF IRREDUCIBILITY, not a PROOF.
* The open alternative — extensible protocol with type-class style — is more principled but harder to implement and easier to misuse.
* The canon records both. The 17 remain the **initial inventory** for v0.1. The open protocol is recorded as a future option in `GSPL_RESEARCH_QUESTIONS.md`. See ADR-0004.

---

## 6. The 7+1-Axis Cross-Check

The Seven-Axis Discipline (`MVP_DEFINITION.md` Part 7) is the structural cross-check that every gseed, mutation, CLI, editor, export, and cross-cutting concern must satisfy:

```
signed · typed · lineage-tracked · graph-structured
     · confidence-bearing · rollback-able · differentiable
```

These are the same as the LINEAGE-DETERMINISTIC-FUNGIBLE contract that a robust seed requires. We add an eighth, RESOURCE-BOUNDED (every expansion respects declared resource budgets) as a research item; it may or may not join the canon in v0.2.

---

## 7. Engineering-Mapping Rule

Per Prompt 1 Section 19 (Theory-to-Engineering), every proposed concept in this document must map to at least one of:

```
Parser behavior · Type-system behavior · IR representation
Compiler pass · Constraint solver · Translation behavior
Code-generation behavior · Runtime behavior
Serialization behavior · Validation rule
Test case · Benchmark · Developer-tool capability
```

Mapping table:

| Component | Mapping |
|---|---|
| Intent | Seed-level field `$metadata.intent` + GSPL-Agent contract |
| Seed | UniversalSeed type (spec/01) — IR + Schema |
| Context | Seed-environment reference, knowledge-version naming |
| Knowledge | Kernel's knowledge base (`knowledge/` package in GP monorepo) |
| Constraint | Type-system refinements (`where`) + validation rules |
| Identity | Sovereignty block + ECDSA P-256 signature |
| Structure | Typed graph inside `genes` and the seed metadata |
| Transformation | Genetic operators (mutate, crossover, breed, compose) |
| Projection | Engine exporters + translation bridge |
| Target | Engine registry (8 canonical engine exports) |
| Provenance | `$lineage` + signature chain |
| Validation | 8 invariants + 7-axis discipline checks |
| Execution | 8-phase tick cycle (spec/03) |
| Compiler | GSPL lexer → parser → AST → typechecker → IR → expansion → emitter |
| Knowledge Base | External module / shared registry |
| Output | Domain-specific exporters (8 canonical outputs) |

---

## 8. Conjecture, Not Conclusion

This document is a CONJECTURE. The goal of first-principles derivation is to expose the strongest possible foundation and to identify the points that resistance will attack first:

1. The hybrid Genome+Generator selection (Candidate A+C over Candidate B).
2. The 17-type irreducibility claim.
3. The seven-axis "load-bearing" framing.
4. The translation-fidelity graduation model.

These four are the foci of `GSPL_RESEARCH_QUESTIONS.md` and of every ADR.
