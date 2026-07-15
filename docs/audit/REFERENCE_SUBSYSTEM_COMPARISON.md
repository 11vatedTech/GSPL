# GSPL Reference Subsystem Comparison

Generated: 2026-07-14T18:11:13.181Z

## Inventions by Subsystem

| Subsystem | Inventions | Dispositions |
|---|---|---|
| kernel | 5 | {"ADOPT":5} |
| gene-system | 2 | {"ADAPT":2} |
| language | 2 | {"ADAPT":1,"ADOPT":1} |
| compiler | 3 | {"ADOPT":1,"ADAPT":1,"RESEARCH":1} |
| runtime | 3 | {"ADAPT":1,"ADOPT":1,"RESEARCH":1} |
| interoperability | 0 | {} |
| translation-bridge | 0 | {} |
| package-system | 2 | {"ADAPT":1,"ADOPT":1} |
| canon-governance | 3 | {"ADOPT":3} |

## Reference Repository Cross-Mapping

Each invention cites evidence from reference repositories.

| Invention | Target Subsystem | Disposition | Evidence Repos |
|---|---|---|---|
| GSPL-INV-0001 | kernel | ADOPT | paradigm-reference, canon-foundation |
| GSPL-INV-0002 | gene-system | ADAPT | paradigm-reference, canon-foundation |
| GSPL-INV-0003 | kernel | ADOPT | paradigm-reference, canon-foundation |
| GSPL-INV-0004 | kernel | ADOPT | paradigm-reference, canon-foundation |
| GSPL-INV-0005 | kernel | ADOPT | paradigm-reference, canon-foundation |
| GSPL-INV-0006 | kernel | ADOPT | paradigm-reference, canon-foundation |
| GSPL-INV-0007 | gene-system | ADAPT | paradigm-reference |
| GSPL-INV-0008 | language | ADAPT | paradigm-reference, canon-foundation |
| GSPL-INV-0009 | language | ADOPT | paradigm-reference |
| GSPL-INV-0010 | compiler | ADOPT | paradigm-reference |
| GSPL-INV-0011 | runtime | ADAPT | paradigm-reference |
| GSPL-INV-0012 | compiler | ADAPT | paradigm-reference |
| GSPL-INV-0013 | compiler | RESEARCH | paradigm-gspl-os, paradigm-reference |
| GSPL-INV-0014 | runtime | ADOPT | paradigm-reference, canon-foundation |
| GSPL-INV-0015 | runtime | RESEARCH | paradigm-reference |
| GSPL-INV-0016 | package-system | ADAPT | paradigm-reference, canon-foundation |
| GSPL-INV-0017 | canon-governance | ADOPT | paradigm-reference |
| GSPL-INV-0018 | canon-governance | ADOPT | canon-foundation |
| GSPL-INV-0019 | package-system | ADOPT | paradigm-gspl-os |
| GSPL-INV-0020 | canon-governance | ADOPT | paradigm-gspl-os, canon-foundation |

## Architecture Decisions

| ADR | Subsystem | Disposition | Refs |
|---|---|---|---|
| GSPL-ARCH-0001 | seed-representation | ADOPT | GSPL-INV-0001 |
| GSPL-ARCH-0002 | gene-model | ADAPT | GSPL-INV-0002 |
| GSPL-ARCH-0003 | rng | ADOPT | GSPL-INV-0003 |
| GSPL-ARCH-0004 | hashing | ADOPT | GSPL-INV-0004 |
| GSPL-ARCH-0005 | canonicalization | ADOPT | GSPL-INV-0005 |
| GSPL-ARCH-0006 | lineage | ADOPT | GSPL-INV-0006 |
| GSPL-ARCH-0007 | genetic-operators | ADOPT | GSPL-INV-0002, GSPL-INV-0007 |
| GSPL-ARCH-0008 | language-grammar | ADOPT | GSPL-INV-0008 |
| GSPL-ARCH-0009 | parser | ADOPT | GSPL-INV-0009 |
| GSPL-ARCH-0010 | ast | ADOPT | GSPL-INV-0010 |
| GSPL-ARCH-0011 | interpreter | ADOPT | GSPL-INV-0011 |
| GSPL-ARCH-0012 | compiler | RESEARCH | GSPL-INV-0012 |
| GSPL-ARCH-0013 | ir | RESEARCH | GSPL-INV-0013 |
| GSPL-ARCH-0014 | runtime | ADOPT | GSPL-INV-0013 |
| GSPL-ARCH-0015 | state | RESEARCH | GSPL-INV-0014 |
| GSPL-ARCH-0016 | packages | ADAPT | GSPL-INV-0015 |
| GSPL-ARCH-0017 | translation | RESEARCH | GSPL-INV-0016 |
| GSPL-ARCH-0018 | studio | REJECT | GSPL-INV-0019 |
| GSPL-ARCH-0019 | cli | ADOPT | GSPL-INV-0019 |
| GSPL-ARCH-0020 | api | REJECT | GSPL-INV-0020 |
| GSPL-ARCH-0021 | lsp | RESEARCH | GSPL-INV-0009 |
| GSPL-ARCH-0022 | testing | ADOPT | GSPL-INV-0020 |
| GSPL-ARCH-0023 | persistence | ADOPT | GSPL-INV-0017 |
| GSPL-ARCH-0024 | security | ADOPT | GSPL-INV-0017 |
| GSPL-ARCH-0025 | plugin-model | RESEARCH | GSPL-INV-0018 |
