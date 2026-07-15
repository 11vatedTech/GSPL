# Reference Repository Inventory

**Status:** Evidence-grounded audit. Updated by `@gspl/reference-indexer` runs.

Six reference repositories were supplied and inventoried:

| ID | Repository | Type | Path | Evidence strength |
|---|---|---|---|---|
| `paradigm-reference` | PAradigm-reference-main | Spec / charter | `Reference-repos_and_planning/PAradigm-reference-main/PAradigm-reference-main` | HIGHEST — the conceptual spec |
| `paradigm-gspl-os` | Paradigm_GSPL_OS-main | TypeScript implementation, clean | `Reference-repos_and_planning/Paradigm_GSPL_OS-main/Paradigm_GSPL_OS-main` | HIGH — canonical implementation of `kernel`, `language`, `evolution`, `intelligence`, `composition`, `runtime`, `library`, `marketplace`, `renderers` |
| `paradigm-main` | Paradigm-main | Messy large prototype | `Reference-repos_and_planning/Paradigm-main (1)/Paradigm-main` | MEDIUM — useful for raw code patterns; reports inflated "100% complete" claims |
| `generative-seed-programming-gspl` | Generative-Seed-Programming-GSPL-main | Monorepo, 36 packages | `Reference-repos_and_planning/Generative-Seed-Programming-GSPL--main/Generative-Seed-Programming-GSPL--main` | MEDIUM — broadest scope; many stub packages |
| `gspl-paradigm` | GSPL-Paradigm-main | Workspace, pnpm | `Reference-repos_and_planning/GSPL-Paradigm-main/GSPL-Paradigm-main` | LOW — duplicate of `generative-seed-programming-gspl` |
| `paradigm-goe-ai` | Paradigm_GOE_AI-main | README-only | `Reference-repos_and_planning/Paradigm_GOE_AI-main/Paradigm_GOE_AI-main` | NONE — only a Google AI Studio README; no GSPL content |

The shortest path to canonical GSPL is **`paradigm-reference` (spec) + `paradigm-gspl-os` (implementation)**. Other repos are secondary evidence.

See `reference-repository-inventory.json` for the machine-readable index.
