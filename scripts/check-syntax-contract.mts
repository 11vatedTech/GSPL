#!/usr/bin/env node
/**
 * scripts/check-syntax-contract.mts
 *
 * Bidirectional consistency gate between
 *   docs/specification/GSPL_GRAMMAR.contract.json
 * and
 *   packages/syntax-tree/src/syntax-kind.ts
 *
 * Exits zero on compliance; non-zero with a precise violation list otherwise.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '..');

interface ContractJson {
  readonly schema: string;
  readonly schemaVersion: string;
  readonly languageVersion: string;
  readonly unicodeProfileVersion: string;
  readonly newlineForms: readonly string[];
  readonly commentDelimiters: {
    readonly line: string;
    readonly block: readonly [string, string];
    readonly documentation: readonly [string, string];
  };
  readonly nestedCommentPolicy: string;
  readonly documentationCommentPolicy: string;
  readonly identifierPolicy: Readonly<Record<string, unknown>>;
  readonly keywords: readonly { readonly lexeme: string; readonly SyntaxKind: string }[];
  readonly literalWords: readonly { readonly lexeme: string; readonly SyntaxKind: string; readonly classification: string }[];
  readonly punctuation: readonly { readonly lexeme: string; readonly SyntaxKind: string }[];
  readonly operators: readonly { readonly lexeme: string; readonly SyntaxKind: string }[];
  readonly parserNodeKinds: readonly string[];
  readonly diagnosticCodes: readonly string[];
  readonly triviaOwnershipVersion: string;
}

interface SyntaxKindRecord { readonly [memberName: string]: number; }

interface ImportedSyntaxTree {
  readonly SyntaxKind: SyntaxKindRecord;
  readonly KEYWORD_KINDS: ReadonlyMap<string, number>;
  readonly PUNCTUATION_KINDS: ReadonlyMap<string, number>;
  readonly OPERATOR_KINDS: ReadonlyMap<string, number>;
}

async function loadContract(): Promise<ContractJson> {
  const p = resolve(repoRoot, 'docs/specification/GSPL_GRAMMAR.contract.json');
  const raw = await readFile(p, 'utf8');
  return JSON.parse(raw) as ContractJson;
}

async function loadSyntaxKindRegistry(): Promise<ImportedSyntaxTree> {
  // SyntaxKind is a `const enum` in the production registry; TypeScript types
  // it as a primitive union, not an object. We cast through `unknown` to
  // reconcile with the Index-Signature interface we declared above.
  const mod = (await import('@gspl/syntax-tree')) as unknown as ImportedSyntaxTree;
  return mod;
}

function fail(violations: readonly string[]): never {
  console.error('CHECK-SYNTAX-CONTRACT: ' + violations.length + ' violation(s):');
  for (const v of violations) console.error('  - ' + v);
  console.error('');
  console.error('Either GSPL_GRAMMAR.contract.json is stale, or');
  console.error('packages/syntax-tree/src/syntax-kind.ts drifted out of sync.');
  console.error('Fix the source of truth, then re-run npm run check:syntax-contract.');
  process.exit(1);
}

function keywordToSyntaxKindName(lexeme: string): string {
  return 'Keyword' + lexeme
    .split('_')
    .map((s) => (s.length === 0 ? '' : s.charAt(0).toUpperCase() + s.slice(1)))
    .join('');
}

async function main(): Promise<void> {
  const contract = await loadContract();
  const reg = await loadSyntaxKindRegistry();
  const violations: string[] = [];

  if (contract.schema !== 'gspl.textual-language.grammar-contract') {
    violations.push('contract.schema must equal "gspl.textual-language.grammar-contract"');
  }
  if (!/^\d+\.\d+$/.test(contract.schemaVersion)) {
    violations.push('contract.schemaVersion must be major.minor');
  }
  if (!/^[a-z0-9_-]+\/\d+\.\d+$/i.test(contract.languageVersion)) {
    violations.push('contract.languageVersion must be "<family>/<major>.<minor>" (was: ' + JSON.stringify(contract.languageVersion) + ')');
  }

  for (const k of contract.keywords) {
    const productionName = keywordToSyntaxKindName(k.lexeme);
    if (productionName !== k.SyntaxKind) {
      violations.push('keyword "' + k.lexeme + '" maps to unexpected SyntaxKind "' + k.SyntaxKind + '"');
    }
    if (!(productionName in reg.SyntaxKind)) {
      violations.push('keyword "' + k.lexeme + '" expects SyntaxKind "' + productionName + '" but registry does not declare it');
    }
    if (reg.KEYWORD_KINDS.get(k.lexeme) !== reg.SyntaxKind[productionName]) {
      violations.push('keyword "' + k.lexeme + '" is not registered in KEYWORD_KINDS or maps to wrong SyntaxKind');
    }
  }

  for (const [lexeme] of reg.KEYWORD_KINDS) {
    if (!contract.keywords.some((k) => k.lexeme === lexeme)) {
      violations.push('production keyword "' + lexeme + '" is not present in contract.keywords');
    }
  }

  for (const p of contract.punctuation) {
    if (reg.PUNCTUATION_KINDS.get(p.lexeme) === undefined) {
      violations.push('punctuation "' + p.lexeme + '" is not in PUNCTUATION_KINDS');
    }
  }
  for (const [lexeme] of reg.PUNCTUATION_KINDS) {
    if (!contract.punctuation.some((p) => p.lexeme === lexeme)) {
      violations.push('production punctuation "' + lexeme + '" missing from contract.punctuation');
    }
  }

  for (const o of contract.operators) {
    if (reg.OPERATOR_KINDS.get(o.lexeme) === undefined) {
      violations.push('operator "' + o.lexeme + '" is not in OPERATOR_KINDS');
    }
  }
  for (const [lexeme] of reg.OPERATOR_KINDS) {
    if (!contract.operators.some((o) => o.lexeme === lexeme)) {
      violations.push('production operator "' + lexeme + '" missing from contract.operators');
    }
  }

  for (const lit of contract.literalWords) {
    if (!['BooleanLiteral', 'AbsenceLiteral'].includes(lit.classification)) {
      violations.push('literal "' + lit.lexeme + '" classification "' + lit.classification + '" is not supported');
    }
    if (reg.KEYWORD_KINDS.get(lit.lexeme) === undefined) {
      violations.push('literal word "' + lit.lexeme + '" is not a registered keyword');
    }
  }

  for (const name of contract.parserNodeKinds) {
    if (!(name in reg.SyntaxKind)) {
      violations.push('parser node kind "' + name + '" is not reserved in SyntaxKind registry');
    }
  }

  for (const code of contract.diagnosticCodes) {
    if (!code.startsWith('GSPL-PARSE-') && !code.startsWith('GSPL-MODULE-')) {
      violations.push('diagnostic "' + code + '" violates namespace (must be GSPL-PARSE-* or GSPL-MODULE-*)');
    }
  }

  const requiredNewlines = ['LF', 'CRLF', 'CR', 'U+2028', 'U+2029'];
  for (const nl of requiredNewlines) {
    if (!contract.newlineForms.includes(nl)) {
      violations.push('newline form "' + nl + '" is required but missing from contract.newlineForms');
    }
  }

  if (!contract.documentationCommentPolicy.includes('EOF')) {
    violations.push('contract.documentationCommentPolicy must reference EOF');
  }

  if (contract.nestedCommentPolicy !== 'disabled') {
    violations.push('contract.nestedCommentPolicy must be "disabled"');
  }

  if (violations.length > 0) fail(violations);

  console.log('CHECK-SYNTAX-CONTRACT: OK');
  console.log('  keywords       : ' + contract.keywords.length);
  console.log('  literalWords   : ' + contract.literalWords.length);
  console.log('  punctuation    : ' + contract.punctuation.length);
  console.log('  operators      : ' + contract.operators.length);
  console.log('  parserNodeKinds: ' + contract.parserNodeKinds.length);
  console.log('  diagnostics    : ' + contract.diagnosticCodes.length);
  console.log('  newlines       : ' + contract.newlineForms.length);
  console.log('');
  console.log('Production registry and GSPL_GRAMMAR.contract.json are in bidirectional sync.');
}

main().catch((e: unknown) => {
  console.error('CHECK-SYNTAX-CONTRACT failed unexpectedly:', e);
  process.exit(2);
});
