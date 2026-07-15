# Architecture Comparison

**Status:** Comparison decision matrix across the 4 evidence-bearing reference repos.

| Subsystem | paradigm-reference | paradigm-gspl-os | paradigm-main | gp-gspl | Disposition |
|---|---|---|---|---|---|
| Seed representation | Genome + metadata | Genome (7 gene types) | Genome (parsed) | Genome (parseable) | **ADOPT** Genome; treat 7 vs 17 as INITIAL-INVENTORY issue (ADR-0004) |
| Gene model | 17 types locked | 7 types implemented | Mixed | Mixed | **ADAPT** — INITIAL 17 inventory, EXTENSIBILITY protocol |
| RNG | xoshiro256** + SplitMix64 + FNV-1a + Box-Muller | unspecified in inspected src | unspecified | unspecified | **ADOPT** per spec/03 |
| Hashing | SHA-256 + JCS | unspecified | unspecified | unspecified | **ADOPT** per spec/05; ADR-0006 |
| Canonicalization | JCS (RFC 8785) + GSPL field ordering | unspecified | unspecified | unspecified | **ADOPT** per spec/05 |
| Lineage | $lineage.parents + operation + generation | metadata-style | metadata-style | metadata-style | **ADOPT** per spec/01 |
| Genetic operators | per-type mutate/crossover/distance | unspecified core ops | unknown | unknown | **ADOPT** per spec/02 |
| Language grammar | 26 keywords + recursive descent | implemented (parser.ts) | partially | unknown | **ADOPT** per spec/04; implementation not yet canonical |
| Parser | Recursive descent | Lexer + Parser | implemented | implemented | **ADOPT**; tests pass for paradigm-gspl-os |
| AST | 25+ node types | implemented | unknown | unknown | **ADOPT** |
| Interpreter | AST interpreter | Interpreter (interpret.js) | unknown | unknown | **ADOPT** |
| Compiler | AST → JS codegen | Compiler.ts | unknown | unknown | **ADOPT** |
| IR | not yet canonicalized | not yet canonicalized | not yet canonicalized | not yet canonicalized | **RESEARCH** — required, not yet in any reference |
| Runtime | 8-phase tick cycle | pipeline.ts uses ad-hoc phases | unknown | unknown | **ADAPT** — adopt 8-phase per spec/03 |
| State management | effect system (8 effects) | unknown | unknown | unknown | **ADAPT** — keep effect system, planned for canon-foundation P3 |
| Package management | .gseed + .gcapsule + .gworld + .gresonance | marketplace pkg | implemented marketplace | unknown | **ADAPT** per spec/06 |
| Translation | spec outlines, no full impl | composition/algebra.ts | partial | unknown | **RESEARCH** per ADR-0007 |
| Studio | planned | React + Vite studio | included | @gspl/studio | **OUT_OF_CANON** per ADR-0010 |
| CLI | planned | paradigm cli | included | cli | **ADOPT** paradigm-gspl-os's CLI shape |
| API | planned | marketplace REST | included | llm/, web/ packages | **OUT_OF_CANON** per ADR-0010 |
| LSP | planned | unknown | unknown | lsp/ package | **ADAPT** |
| Testing | spec calls for property tests | vitest tests | vite + vitest | workspace tests | **ADOPT** Vitest; property tests for gene types |
| Persistence | spec/05 sovereignty | local file | database + IPFS | unknown | **ADAPT** per spec/05 |
| Security | spec/05 ECDSA P-256 — RFC 6979 | unspecified | implementations introduce custom crypto | unknown | **ADOPT** per spec/05 |
| Plugin model | planned | unknown | unknown | unknown | **RESEARCH** deferred to P5 |

**Summary**: 16 ADOPTs, 4 ADAPTs, 3 RESEARCH, 3 OUT_OF_CANON. The "ADAPT" cluster around reproducibility primitives (RNG, hash, canonicalization, sovereignty) reflects the canon's emphasis on making spec/03 and spec/05 *actual* canonical code, not just narrative. The "RESEARCH" cluster is honest about where no clear canonical answer yet exists.

See `architecture-decisions.json` for the machine-readable form.
