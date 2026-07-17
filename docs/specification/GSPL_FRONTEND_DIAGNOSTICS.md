# GSPL Frontend Diagnostics

**Version**: gspl-text/1.0 | **Status**: Implemented | **Prompt 3 §18**

## Structure

Every diagnostic carries: code, severity, category, phase, primary span, message, canonical flag.

## Namespaces

| Prefix | Phase | Description |
|--------|-------|-------------|
| GSPL-SOURCE-* | source | Source loading/encoding errors |
| GSPL-LEX-* | lex | Lexer errors |
| GSPL-PARSE-* | parse | Parser errors |
| GSPL-MODULE-* | module | Module resolution errors |
| GSPL-BIND-* | bind | Binding errors (duplicates, unresolved) |
| GSPL-TYPE-* | type | Type analysis errors |
| GSPL-LOWER-* | lower | Canonical lowering errors |
| GSPL-FORMAT-* | format | Formatter errors |
| GSPL-CLI-* | cli | CLI errors |

## Ordering

Diagnostics are sorted deterministically: source identity → start offset → end offset → severity rank → code → message.

## Diagnostic Cap

maxDiagnostics limits total emitted diagnostics. When reached, GSPL-LEX-DIAGNOSTIC-LIMIT is emitted and subsequent diagnostics are discarded.
