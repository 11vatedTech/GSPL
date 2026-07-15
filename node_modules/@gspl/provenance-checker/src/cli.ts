import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { checkProvenance } from './validators.js';
import type { InventionRegistry, ArchitectureComparisonRegistry, SourceRegistry } from './types.js';

interface CliOptions {
  inventionsPath: string;
  decisionsPath: string;
  sourcesPath: string;
  reportPath: string;
  knownRepoPaths?: Set<string>;
}

function parseArgs(argv: readonly string[]): CliOptions | null {
  let inv: string | undefined;
  let dec: string | undefined;
  let src: string | undefined;
  let rpt: string | undefined;
  let known: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--inventions' && i + 1 < argv.length) inv = argv[++i];
    else if (a === '--decisions' && i + 1 < argv.length) dec = argv[++i];
    else if (a === '--sources' && i + 1 < argv.length) src = argv[++i];
    else if (a === '--report' && i + 1 < argv.length) rpt = argv[++i];
    else if (a === '--known-repo-paths' && i + 1 < argv.length) known = argv[++i];
    else if (a === '--help' || a === '-h') return null;
  }
  if (!inv || !dec || !src) return null;
  rpt = rpt ?? 'canon/provenance/validation-report.json';
  return {
    inventionsPath: inv,
    decisionsPath: dec,
    sourcesPath: src,
    reportPath: rpt,
    knownRepoPaths: known ? new Set(JSON.parse(readFileSync(known, 'utf-8'))) : undefined,
  };
}

function help(): void {
  process.stdout.write(
    `gspl-provenance -- provenance validator for the GSPL canon\n\n` +
    `Usage:\n  gspl-provenance --inventions <file> --decisions <file> --sources <file>\n` +
    `                   [--report <file>] [--known-repo-paths <file>]\n`
  );
}

export async function main(argv: readonly string[]): Promise<number> {
  const opts = parseArgs(argv);
  if (!opts) { help(); return 64; }

  const rawInv = JSON.parse(readFileSync(opts.inventionsPath, 'utf-8')) as InventionRegistry;
  const rawDec = JSON.parse(readFileSync(opts.decisionsPath, 'utf-8')) as ArchitectureComparisonRegistry;
  const rawSrc = JSON.parse(readFileSync(opts.sourcesPath, 'utf-8')) as SourceRegistry;

  const report = checkProvenance({
    sources: rawSrc,
    inventions: rawInv,
    decisions: rawDec,
    knownRepoPaths: opts.knownRepoPaths,
  });

  mkdirSync(dirname(opts.reportPath), { recursive: true });
  writeFileSync(opts.reportPath, JSON.stringify(report, null, 2) + '\n', 'utf-8');

  process.stderr.write(
    `[gspl-provenance] report: ${opts.reportPath}\n` +
    `[gspl-provenance] status: ${report.ok ? 'PASS' : 'FAIL'}\n` +
    `[gspl-provenance] errors: ${report.errors.length}, warnings: ${report.warnings.length}\n`
  );
  return report.ok ? 0 : 2;
}
