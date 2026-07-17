# GSPL Frontend Compiler SDK

**Version**: gspl-text/1.0 | **Status**: Implemented | **Prompt 3 §9**

## Public API

```typescript
import { createFrontendCompiler, compile, compileText, compileFile } from "@gspl/frontend";

// Create a compiler context (no global state)
var ctx = createFrontendCompiler({
  languageVersion: "gspl-text/1.0",
  sourceRoot: "./src",
  parseOptions: DEFAULT_PARSE_OPTIONS,
  lowerOptions: DEFAULT_LOWERING_OPTIONS,
  formatOptions: DEFAULT_FORMAT_OPTIONS,
});

// Compile from source document
var result = compile(ctx, sourceDocument);

// Compile from text
var result = compileText(ctx, "example.gspl", "seed 1.0 gene x = 1");

// Compile from file
var result = compileFile(ctx, "./src/main.gspl");
```

## CompileResult

```typescript
interface CompileResult {
  readonly source: SourceDocument;
  readonly parseResult: ParseResult;      // CST
  readonly ast: AstLoweringResult;        // typed AST
  readonly binding: BindingResult;         // symbol table
  readonly typeEnv: TypeEnvironment;       // type registry
  readonly typeValidation: StructuralValidationResult;
  readonly authoring: AuthoringProgram;    // resolved representation
  readonly canonical: CanonicalLoweringResult; // Prompt 2 seed
  readonly ir: IrLoweringResult;           // Prompt 2 IR
  readonly formatted: FormatResult;        // formatted source
  readonly allDiagnostics: Diagnostic[];
}
```

## CLI

```bash
gspl lex <file>        # tokenize
gspl parse <file>      # parse to CST
gspl check <file>      # parse + bind + type-check
gspl format <file>     # format source
gspl lower <file>      # lower to canonical seed
gspl ir <file>         # lower to GSPL IR
gspl explain <file>    # provenance query
```

Exit codes: 0=success, 1=source/frontend diagnostics, 2=invalid CLI/config, 3=resource/security rejection, 4=internal failure.
