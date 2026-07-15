# Governance

The canon has three governance pillars:

1. ADRs in docs/canon/decisions/ - every canonical decision is captured as an Architecture Decision Record (context, options, evidence, decision, consequences, risks, unresolved).
2. Provenance ledger in canon/provenance/inventions.json - every canon concept has a stable invention ID, sources, and disposition. CI fails if a new ID is malformed.
3. Claim classifier in canon/provenance/claims.json - every claim has a 8-status rating (PROVEN, IMPLEMENTED, PARTIALLY_IMPLEMENTED, PROTOTYPED, THEORETICAL, RESEARCH_REQUIRED, UNSUPPORTED, REFUTED). Non-THEORETICAL requires evidence.

## Modifying Canon

A canon modification requires:
- An ADR binding the change to existing invention IDs.
- An entry in the invention ledger.
- A claim-status update tied to the change.
- Passing npm run validate.

## What is out of canon

Studio, marketplace, federated identity, sprites - all live in downstream repositories. See docs/canon/GSPL_SCOPE_AND_NON_GOALS.md.

## Author sovereignty

Sign every published seed with ECDSA P-256 (RFC 6979). Verify with the sovereign verifier.
