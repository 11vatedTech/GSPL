# ADR-P3-020: Compiler SDK

**Status**: ACCEPTED | **Prompt 3 §9**

## Context
The frontend must provide a deterministic, stateless public API for compilation, formatting, and provenance queries.

## Decision
Single factory `createFrontendCompiler(options)` returns a context object. All pipeline operations accept the context explicitly. No global mutable state. No singleton compiler instance.

## Consequences
- Multiple compilers can coexist with different configurations
- Explicit dependency injection simplifies testing
- No hidden process-wide caches
