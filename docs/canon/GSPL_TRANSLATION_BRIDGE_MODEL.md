# GSPL Translation Bridge Model

**Status:** Canonical. Modifications require GID + ADR.

## 1. The translation problem

```
Source Representation
        ↓
Recovery (source → canonical GSPL)
        ↓
Canonical GSPL Representation
        ↓
Transformation (canonical → canonical, optional)
        ↓
Target Projection
        ↓
Target Representation
```

Three sub-problems: Recovery, Transformation, Projection.

## 2. Fidelity levels

Every translation declares one of:

| Level | Description | Example |
|---|---|---|
| **EXACT** | byte-identical or behaviorally identical with machine-check | TS → JS (same TS compiler) |
| **SEMANTICS_PRESERVING** | formal semantics preserved modulo effect reordering, memory layout | C++ → C |
| **ARCHITECTURE_PRESERVING** | architectural invariants preserved; idioms may adapt | TS → Rust |
| **BEHAVIOR_PRESERVING** | externally observable behavior preserved under declared workload | cross-paradigm |
| **APPROXIMATE** | heuristically faithful; declared gaps typed | widely different paradigms |
| **ASSISTED** | human-corrected post-machine pass | translation projects |
| **IMPOSSIBLE** | human re-implementation required | bridges never claim this |

## 3. Preservation matrix

Each translation records preservation on:

```
program behavior · public API · data model · architecture
concurrency semantics · memory semantics · error semantics
performance (qualitative) · type guarantees · security boundaries
tests · documentation · licensing and provenance
```

## 4. Unavoidable losses

* manual memory ↔ GC (temporal profile changes);
* dynamic reflection ↔ static systems;
* unsafe ↔ safe (dropped semantic);
* macros (target-language equivalent may not exist);
* undefined behavior (UB has no canonical meaning);
* language-specific metaprogramming;
* platform-specific APIs;
* concurrency models;
* binary formats.

The bridge declares a `losses` field on every translation.

## 5. Pipeline

```
INTAKE → PARSE → RECOVER → TRANSFORM → PROJECT → EMIT → VERIFY → REPORT
```

Each phase records its fidelity-level declaration. The bridge is auditable end-to-end.

## 6. Bidirectional contract

* forward: source → canonical → target.
* backward: target → canonical → source.
* round-trip: source → canonical → target → canonical → source2; `source2 ≈ source`.

Failure logged; success recorded.

## 7. The "GSPL does not invent" rule

The bridge never invents functionality not in the source. Translation preserves bugs.

## 8. Examples

| Task | Level |
|---|---|
| TypeScript → JavaScript (same TS compiler settings) | EXACT |
| TypeScript → JavaScript (different TS compiler settings) | SEMANTICS_PRESERVING |
| React state-management → Solid | ARCHITECTURE_PRESERVING |
| C++ → Rust | APPROXIMATE + targeted ASSISTED |
| JS → WASM (asm.ts) | SEMANTICS_PRESERVING |
| OpenAPI spec → Express + Zod scaffold | ARCHITECTURE_PRESERVING |
| `.gseed` → Godot scene | ARCHITECTURE_PRESERVING |

A bridge that cannot declare its level is ANTI-CANONICAL.

## 9. Decision binding

This binds to ADR-0007 and `GSPL_SUCCESS_CRITERIA.md` SC-014.
