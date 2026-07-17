# GSPL Textual Language

**Version**: gspl-text/1.0 | **Status**: Implemented | **Prompt 3 § textual language**

## Grammar

The GSPL textual language is a deterministic, unambiguous, versioned grammar suitable for lossless parsing and incremental tooling.

## Declarations

```ebnf
program = {import-decl} {export-decl} seed-decl {gene-decl}
import-decl = "import" string-literal ["as" identifier]
export-decl = "export" identifier {"," identifier}
seed-decl = "seed" [version-literal] {seed-body-item}
seed-body-item = clause | gene-decl | constraint-block | entropy-block | effects-block | budget-block | target-decl | extension-decl
gene-decl = ["private"] "gene" identifier [":" type-expr] ["=" expression] ["confidence" number]
```

## Types

```ebnf
type-expr = named-type | list-type | map-type | optional-type
named-type = identifier
list-type = "[" type-expr "]"
map-type = "{" identifier ":" type-expr {"," identifier ":" type-expr} "}"
optional-type = type-expr "?"
```

## Expressions

```ebnf
expression = literal | identifier | binary-expr | unary-expr | list-expr | record-expr | "(" expression ")"
binary-expr = expression operator expression
unary-expr = operator expression
list-expr = "[" [expression {"," expression}] "]"
record-expr = "{" identifier ":" expression {"," identifier ":" expression} "}"
```

## Literals

| Kind | Example | Lexical Form |
|------|---------|-------------|
| integer | 42, 0xFF, 0b1010 | decimal, hex, binary, octal |
| float | 3.14, 1e10 | decimal with optional exponent |
| string | "hello" | double-quoted with escapes |
| boolean | true, false | keyword |
| absence | none | keyword |

## Keywords

`seed`, `gene`, `import`, `export`, `private`, `confidence`, `true`, `false`, `none`, `constraints`, `entropy`, `effects`, `budget`, `targets`, `extensions`, `purpose`, `non_goal`

## Comments

- Line comments: `//` to end of line
- Block comments: `/* ... */` (nestable with bounded depth)
- Documentation comments: `/** ... */` (attach to following declaration)

## Operators

`+`, `-`, `*`, `/`, `%`, `=`, `==`, `!=`, `<`, `>`, `<=`, `>=`, `:`, `,`, `;`, `{`, `}`, `(`, `)`, `[`, `]`, `?`

## Lowering

All textual constructs lower deterministically to the Prompt 2 canonical seed model. Unknown types are fatal errors (no fallback to GS-001). Desugaring traces record type inference and default application.
