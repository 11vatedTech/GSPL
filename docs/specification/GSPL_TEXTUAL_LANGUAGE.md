# GSPL Normative Textual Language

**Status:** Prompt 3 draft, normative under `gspl-text/1.0`.
**Companion files:** `docs/specification/GSPL_GRAMMAR.contract.json`, `docs/specification/GSPL_LEXICAL_GRAMMAR.md`.
**Language version:** `gspl-text/1.0`.
**Universe:** syntax-only. This file defines how canonical concepts are authored.
Canonical semantics are defined in Prompt 2 (`packages/seed-format`,
`packages/gene-protocol`, `packages/canon-foundation`).

## 1. Purpose and scope

The GSPL textual language is the author-facing projection of the Prompt 2
canonical model. Every textual construct lowers deterministically into a
canonical seed field per §16 (canonical lowering) and §17 (IR lowering).

The textual language does **not** introduce runtime semantics. It is
purely a syntactic surface for declaring canonical data.

A `.gspl` textual source is:

```text
secure source bytes
  → immutable source snapshot
  → lossless tokenization
  → lossless CST
  → typed AST
  → bound authoring representation
  → Prompt 2 CanonicalSeed
  → Prompt 2 GSPL IR
```

This slice closes the syntactic ground truth for the first four steps
above. Parser, AST, lowering, and toolchain slices follow.

## 2. Lexical foundation

Token model is defined by `GSPL_LEXICAL_GRAMMAR.md`. This file is
normative only at the **grammar** layer; lexemes themselves are
fully delegated. Every name appearing in this document refers to a
`SyntaxKind` value registered in `packages/syntax-tree/src/syntax-kind.ts`.

## 3. Top-level structure

A textual source is either:

* a `Document` containing one `SeedDeclaration` (single-seed form), or
* a `Document` containing zero or more `ModuleDeclaration` and
  `ImportDeclaration` / `ExportDeclaration` clauses followed by exactly
  one `SeedDeclaration` (multi-module form).

```ebnf
Document       ::= ModuleClause* SeedClause
ModuleClause   ::= ModuleDecl | ImportDecl | ExportDecl
```

The seed declaration is the mandatory root. There is **exactly one
`SeedDeclaration` per `.gspl` file.** Module declarations and imports
appear above the seed and may reference it via path imports.

## 4. Seed declaration

```ebnf
SeedClause ::= VersionHeader SeedHeader
VersionHeader ::= "seed" VersionLiteral
SeedHeader ::= TitleClause? VersionClause? DomainClause? IdClause? IntentClause?
              ImportClause* ExportClause*
              (GeneDecl | ConstraintBlock | EntropyBlock | EffectsBlock |
               BudgetBlock | TargetDecl | ExtensionDecl)*
```

The seed declaration lowers to:

```text
UniversalSeed {
  schema: "gspl.canonical-seed"
  schemaVersion: "1.0"
  identity: SeedIdentity
  namespace?: SeedNamespace
  domainProfile: DomainProfile
  intent: DeclaredIntent
  payload: TypedPayload          // genes
  constraints: SeedConstraints
  dependencies: SeedDependencies // imports + extension/export refs
  entropy: DeterministicEntropyDeclaration
  lineage: SeedLineage           // derived during lowering, not authored
  provenance: SeedProvenance     // derived during lowering
  resourceBudget: ResourceBudget
  effectPermissions: EffectPermissions
}
```

### 4.1 Version literal

```ebnf
VersionLiteral ::= "1.0"     // literal major.minor, no wildcards
```

The version literal is a syntactic placeholder for the canonical
`schemaVersion`. Today only `"1.0"` is accepted.

### 4.2 Title clause

```ebnf
TitleClause ::= "title" StringLiteral
```

Lowers to `SeedNamespace.title` when it is the only namespace field;
otherwise to `identity.authoredId`.

### 4.3 Version clause (canonical)

```ebnf
VersionClause ::= "version" StringLiteral
```

Lowers to `identity.revisionId` of the seed.

### 4.4 Domain clause

```ebnf
DomainClause ::= "domain" Identifier
```

Lowers to `domainProfile.domainId`. The identifier must be one of the
26 declared domains (see `packages/canon-foundation/src/constants.ts`
`DOMAINS`). Unknown domains emit `GSPL-PARSE-UNKNOWN-DOMAIN`.

### 4.5 Id clause

```ebnf
IdClause ::= "id" StringLiteral
```

Lowers to `namespace.id` of the form `"<domain>:<path>"` and to
`identity.packageId`.

### 4.6 Intent clause

```ebnf
IntentClause ::= "intent" "{" (PurposeClause | GoalClause | NonGoalClause)* "}"
PurposeClause ::= "purpose" StringLiteral
GoalClause    ::= "goal" StringLiteral
NonGoalClause ::= "non_goal" StringLiteral
```

Lowers to `DeclaredIntent.{purpose, architecturePatterns, nonGoals}`.
The first `goal` clause maps to `purpose`. Subsequent `goal` entries
fold into `architecturePatterns`. `non_goal` entries fold into
`nonGoals` deterministically.

## 5. Import / Export / Local

### 5.1 Import

```ebnf
ImportClause ::= "import" PathLiteral ("as" Identifier)?
PathLiteral  ::= StringLiteral          // RFC 3986 relative or absolute path
```

Lowers to a `ContextReference` (path import) or `KnowledgeReference`
(dep import). Local form is reserved for future host-scope imports.

### 5.2 Export

```ebnf
ExportClause ::= "export" "{" Identifier ("," Identifier)* "}"
```

Lowers to `PackageContract.declaredEffects` filtered to the gene names
declared via `ExportClause`.

### 5.3 Private modifier

```ebnf
PrivateModifier ::= "private"
ImportClause ::= PrivateModifier? "import" PathLiteral "as" Identifier
GeneDecl ::= PrivateModifier? "gene" ...
```

`private` clauses lower to declarations whose visibility is `internal`
rather than `public`.

## 6. Gene declarations

```ebnf
GeneDecl      ::= PrivateModifier? "gene" Identifier ":" TypeRef "=" Expression ConfidenceClause?
ConfidenceClause ::= "confidence" FloatLiteral
```

Lowers to:

```text
genes: { [Identifier]: SeedGene {
  type: GeneTypeId (must be one of the canonical 17 or registry-known)
  value: <lowered Expression>
  confidence?: FloatLiteral (0.0..1.0)
  locked?: boolean (defaults false)
  constraints?: SeedGeneConstraint[] (empty unless narrowed)
}}
```

Diagnostic codes:

* `GSPL-PARSE-UNKNOWN-GENE-TYPE` for unknown type identifiers.
* `GSPL-PARSE-CONFIDENCE-OUT-OF-RANGE` for `confidence` outside [0,1].

### 6.1 TypeRef

The textual language defines **six** type forms:

```ebnf
TypeRef       ::= NamedType | ListType | MapType | OptionalType | VariantType | RecordType

NamedType     ::= Identifier                      // gene type id, primitive, or domain
ListType      ::= "[" TypeRef "]"
MapType       ::= "{" Identifier ":" TypeRef "}"  // record value type
OptionalType  ::= TypeRef "?"
VariantType   ::= TypeRef ("|" TypeRef)+         // order matters; canonical sorts
RecordType    ::= "{" (Identifier ":" TypeRef ("," Identifier ":" TypeRef)*)? "}"
```

Authoring the gene type on a `gene` decl is interpreted as a
**named canonical gene-type id** (`scalar`, `vector`, …). For values
within `Constraints`, `Entropy`, and `Effects`, the type forms
above apply.

Variants are sorted deterministically before lowering
(`lexicographic by type name`).

## 7. Constraint block

```ebnf
ConstraintBlock ::= "constraints" "{" ConstraintItem* "}"
ConstraintItem  ::= RequireClause | ForbidClause | InvariantClause
RequireClause   ::= "require" Expression
ForbidClause    ::= "forbid" Expression
InvariantClause ::= "invariant" Identifier ":" Expression
```

Lowers to:

* `require` and `forbid` ⇒ `SeedConstraints.valueRanges` (subject to
  reclassification by a future accuracy pass).
* `invariant` ⇒ `valueRanges` with `id = "invariant:<identifier>"`.

`Expression` in this clause is the canonical deterministic
expression surface defined in §10.

## 8. Entropy block

```ebnf
EntropyBlock ::= "entropy" "{" EntropyItem* "}"
EntropyItem  ::= AlgorithmClause | RootClause | ChannelClause
AlgorithmClause ::= "algorithm" "=" Identifier
RootClause      ::= "algorithm_version" "=" StringLiteral
RootClause      ::= "root" "=" IntegerLiteral
ChannelClause ::= "channel" Identifier ":" ChannelKind
ChannelKind   ::= "stream" | "root" | Identifier
```

Lowers to `DeterministicEntropyDeclaration.{algorithm, algorithmVersion, rootSeed, channels[]}`.
Recognized algorithms today: `xoshiro256starstar`, `splitmix64`.
Unknown algorithms emit `GSPL-PARSE-UNKNOWN-ENTROPY-ALGORITHM`.

## 9. Effects block

```ebnf
EffectsBlock ::= "effects" "{" EffectItem* "}"
EffectItem  ::= EffectClause
EffectClause ::= EffectKey "=" EffectValue
```

Where:

```ebnf
EffectKey   ::= "filesystem" | "network" | "process" | "environment" | "clock" | "model_inference"
EffectValue ::= "deny" | "allow" | "read_only"
```

Lowers to `EffectPermissions`. `read_only` is accepted only on the
`filesystem` key; declaring it on any other key produces
`GSPL-PARSE-INVALID-EFFECT-VALUE`.

## 10. Budget block

```ebnf
BudgetBlock ::= "budget" "{" BudgetItem* "}"
BudgetItem  ::= MetricKey "=" IntegerLiteral ("/" "unlimited")?
MetricKey   ::= "max_time_ms" | "max_memory_bytes" | "max_operations" | "max_file_count"
```

Lowers to `ResourceBudget`. The `/ unlimited` suffix yields
`undefined` (no cap); absence yields the integer.

## 11. Target declarations

```ebnf
TargetDecl ::= "target" Identifier ":" TargetKind RequiresClause? EquivalenceClause?
```

Where `TargetKind ∈ { source | binary | asset | document | media | scene | configuration | composite }`.

Lowers to `TargetContract`. `requires [a, b]` lowers to `requiredCapabilities`.
Missing required capabilities emit `GSPL-PARSE-MISSING-REQUIRED-CAPABILITY`.

## 12. Extension declarations

```ebnf
ExtensionDecl ::= "extension" Identifier "(" ExtensionParamList? ")" ":" TypeRef "=" Expression
ExtensionParamList ::= ExtensionParam ("," ExtensionParam)*
ExtensionParam ::= Identifier ":" TypeRef
```

Lowers to an entry under `dependencies.knowledgeRefs[].components[]`
or to an annotation ledger entry. Extension parameters are the only
places where author-defined parameter typing can introduce new
gene-type names; unknown names emit `GSPL-PARSE-UNKNOWN-GENE-TYPE`.

## 13. Expressions

Expressions are typed in the textual language by the lowerer, not
declared. Their surface in this language covers the explicit prompt-2
roles:

```ebnf
Expression ::= Literal
             | Identifier
             | Identifier "(" (Expression ("," Expression)*)? ")"
             | Expression BinaryOp Expression
             | "[" (Expression ("," Expression)*)? "]"
             | "{" (Identifier ":" Expression ("," Identifier ":" Expression)*)? "}"

BinaryOp ::= "+" | "-" | "*" | "/" | "%" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "&&" | "||" | ".." | "in"
```

Precedence is fixed and explicit (see `GSPL_GRAMMAR.contract.json`
under `expressionPrecedence`). Every operator returns one of the
cataloged types in `seed-format/src/seed.ts`.

## 14. Value literals

```ebnf
Literal ::= IntegerLiteral
          | FloatLiteral
          | StringLiteral
          | RawStringLiteral
          | MultilineStringLiteral
          | "true"                                // BooleanLiteral
          | "false"                               // BooleanLiteral
          | "none"                                // AbsenceLiteral
          | VersionLiteral                        // SchemaVersionLiteral
```

String literals support escape sequences defined by the lexer spec;
the textual language adds no new escapes. Diagnostic spies are emitted
through the lexer, never through the parser.

## 15. Annotations and documentation comments

Documentation comments attaching to a node lower to that node's
`provenance` field. Free annotations (`@name value`) attach to the
provenance bag; unknown annotation names do not produce diagnostics
in this slice — they lower to `provenance.annotations`.

```ebnf
Annotation ::= "@" Identifier (Literal)?
```

## 16. Diagnostic codes produced by the textual grammar

| Code                                | When                                |
|-------------------------------------|-------------------------------------|
| `GSPL-PARSE-UNKNOWN-DOMAIN`         | `domain` clause names an unknown    |
| `GSPL-PARSE-UNKNOWN-GENE-TYPE`      | gene type id not in registry        |
| `GSPL-PARSE-CONFIDENCE-OUT-OF-RANGE`| confidence not in [0,1]             |
| `GSPL-PARSE-UNKNOWN-ENTROPY-ALGO`   | entropy algorithm unknown           |
| `GSPL-PARSE-INVALID-EFFECT-VALUE`   | effect value malformed              |
| `GSPL-PARSE-MISSING-REQUIRED-CAP`   | target lacks a required capability  |
| `GSPL-PARSE-EXPECTED-TOKEN`         | parser recovery                     |
| `GSPL-PARSE-UNEXPECTED-EOF`         | mid-construction EOF                |
| `GSPL-PARSE-DUPLICATE-CLAUSE`       | duplicate metadata clause           |
| `GSPL-PARSE-INTEGER-OVERFLOW`       | author literal exceeds BigInt        |

## 17. Lossless desugaring contract

Every textual form has exactly one canonical lowering. The
desugaring is:

* **Deterministic** — the canonical output is identical for two
  equivalent textual inputs regardless of host (OS, locale, time).
* **Order-stable** — field ordering in the canonical seed follows the
  canonical `SeedFormat` contract, not the textual order.
* **Identifier-canonical** — keyword-shaped identifiers are recorded
  as keywords; identifiers that look like keywords but appear where
  identifiers are required remain `Identifier`s and do not switch.
* **Variants-sorted** — variant composition is sorted lexicographically
  before lowering.
* **Effect-flattened** — `effects` clauses are flattened into
  `EffectPermissions` boolean/string set, with `read_only` mapped to
  `filesystem: "read"`.

Non-author fields (`lineage.generation`, `provenance.author`,
`provenance.tool`, `provenance.compilerVersion`,
`provenance.canonVersion`, `identity.contentId`,
`identity.lineageId`) are **derived** during lowering, not authored.

## 18. Losslessness vs lowering

The textual language's losslessness property is about the **parser
slice**: `printCST(parse(source)) == source`. The canonical-seed
surface is **deliberately lossy** because canonical forms normalize
authors' choices. The parser preserves trivia; the canonical seed
discards it.

## 19. Future compatibility

Reserved for future extensions:

* Generics (will use `[T]` syntax if introduced; pre-empted by
  `LeftBracket`/`RightBracket` already in `SyntaxKind`).
* Decorator chain (`@` blocks) — already accepted as annotations.
* Conditional constructs (`if` … `else` …) — reserved as
  authoring sugar under a future `AuthoringConditional` SyntaxKind
  and a future authoring-version bump.

Additions to the textual language SHOULD land as authoring-sugar
syntax only. Canonical concepts grow through the gene-protocol and
package model, not through more keywords.

## 20. Validation references

* `GSPL_GRAMMAR.contract.json` — machine-readable synopses.
* `GSPL_LEXICAL_GRAMMAR.md` — token-level contract.
* `GSPL_FIRST_PRINCIPLES.md` — canon intent.
* `ADR-P3-013-normative-textual-language.md` — language-design ADR.
