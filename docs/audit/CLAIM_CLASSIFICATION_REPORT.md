# GSPL Claim Classification Report

**Generated:** 2026-07-14T16:19:17.948Z
**Schema:** `gspl.claims-report` v1.0
**Source:** `canon/provenance/claim-classification-report.json`
**Tool:** `tools/claim-classifier`

## 1. Run

```bash
node tools/claim-classifier/dist/cli.js \
  --claims canon/provenance/claims.json \
  --report canon/provenance/claim-classification-report.json
```

## 2. Result

| Field | Value |
|---|---|
| Status | **PASS** |
| Errors | 0 |
| Warnings | 0 |
| Claims checked | 12 |
| Illegal transitions | 0 |
| Unsupported claims | 0 |

## 3. Status distribution

| Status | Count |
|---|---|
| PROVEN | 0 |
| IMPLEMENTED | 2 |
| PARTIALLY_IMPLEMENTED | 2 |
| PROTOTYPED | 2 |
| THEORETICAL | 2 |
| RESEARCH_REQUIRED | 2 |
| UNSUPPORTED | 0 |
| REFUTED | 2 |

## 4. Per-claim status (from `canon/provenance/claims.json`)

| Claim ID | Statement (short) | Status |
|---|---|---|
| `GSPL-CLAIM-0001` | Core GSPL hypothesis is provisionally viable | PROTOTYPED |
| `GSPL-CLAIM-0002` | Universal arbitrary-data compression is REFUTED | REFUTED |
| `GSPL-CLAIM-0003` | Perfect universal cross-paradigm translation is REFUTED | REFUTED |
| `GSPL-CLAIM-0004` | Seed-first program reconstruction | PARTIALLY_IMPLEMENTED |
| `GSPL-CLAIM-0005` | Multi-projection (struct/graph/topology/field) | THEORETICAL |
| `GSPL-CLAIM-0006` | Initial 17-gene inventory is irreducible | RESEARCH_REQUIRED |
| `GSPL-CLAIM-0007` | Cross-architecture determinism | RESEARCH_REQUIRED |
| `GSPL-CLAIM-0008` | JCS canonical encoding + SHA-256 stable IDs | IMPLEMENTED |
| `GSPL-CLAIM-0009` | Provenance checker has validated the actual canonical registries | IMPLEMENTED |
| `GSPL-CLAIM-0010` | Architecture synthesis as design capability | THEORETICAL |
| `GSPL-CLAIM-0011` | Test suites round-trip through compilation | PARTIALLY_IMPLEMENTED |
| `GSPL-CLAIM-0012` | Independently repeated builds produce byte-identical content | PROTOTYPED |

## 5. Ladder discipline

- No claims sit at `PROVEN` (the strongest ladder rung); this matches the policy that promotion to `PROVEN` requires end-to-end seed-to-codebase reconstruction plus cross-language verification, scheduled for Prompt 2/3.
- No claims sit at `UNSUPPORTED`; the lower two rungs (`UNSUPPORTED`, `REFUTED`) are populated only for claims with formal non-implementability (REFUTED) or no current support (UNSUPPORTED).
- Zero illegal ladder-skip transitions detected. The `REQUIRES_EVIDENCE` invariant holds for every claim at `PROTOTYPED` or above.
- Every claim at `PROTOTYPED` and above has at least one `evidence[]` entry.
- Every claim at `PROTOTYPED` and above has at least one `falsificationCriteria[]` entry.

## 6. REFUTED claims (deliberate, defended)

- **`GSPL-CLAIM-0002`** — Universal arbitrary-data compression is REFUTED. Defended via Kolmogorov (1965): no universal compressor exists; compression is always conditioned on the distribution of inputs.
- **`GSPL-CLAIM-0003`** — Perfect universal cross-paradigm translation is REFUTED. Defended via Felleisen (1991) on expressive power: paradigms encode non-equivalent semantic invariants; perfect translation is impossible. GSPL supports GRADUATED translation fidelity (RC-1..RC-8) but not perfect translation.

These claims exist to make the canon's non-implementability surface explicit and falsifiable.

## 7. RESEARCH_REQUIRED claims (open hostile review)

- **`GSPL-CLAIM-0006`** — Initial 17-gene inventory is irreducible. Empirically motivated in `spec/02`; hostile review (attempt to emulate any one gene type via composition of the remaining 16) is the falsification criterion.
- **`GSPL-CLAIM-0007`** — Cross-architecture determinism. Pending end-to-end test on at least two independent architecture targets outside the canon-foundation determinism stack.

## 8. Implementation coverage

The two `IMPLEMENTED` claims (`0008`, `0009`) together establish the **deterministic-hash substrate** (`packages/canon-foundation`) and the **provenance-validation substrate** (`tools/provenance-checker`). Their promotion to `PROVEN` in Prompt 2+ requires end-to-end seed-to-codebase reconstruction tests pinned by SHA-256.
