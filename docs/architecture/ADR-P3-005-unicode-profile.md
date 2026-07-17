# ADR-P3-005: Unicode Profile

**Status**: ACCEPTED | **Prompt 3 §5**

## Context
GSPL identifiers must support Unicode while providing security against confusable and bidi attacks.

## Decision
UTF-16 code unit coordinate system with code-point-aware scanning. Identifier classification uses proper Unicode scalar values. Supplementary-plane characters are rejected in v1. Unpaired surrogates emit GSPL-SOURCE-UNPAIRED-SURROGATE. Normalization is NFKC-based. Confusable skeleton field is declared in IdentifierLexicalValue for future Unicode confusable data integration.

## Consequences
- Deterministic identifier identity independent of source spelling
- Security findings exposed per identifier
- ASCII fast path is behaviorally equivalent
