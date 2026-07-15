import { writeAllRegistries } from './registry.js';
import { writeClaimsRegister, writeInventionLedger, writeProvenanceRegistry } from './ledgers.js';
import { checkLedgersVsJson } from './consistency.js';
import { existsSync } from 'node:fs';

interface CliOptions {
  mode: 'write' | 'validate' | 'write-and-validate';
  repoRoot: string;
}

function parseArgs(argv: readonly string[]): CliOptions | null {
  let mode: CliOptions['mode'] = 'write';
  let repoRoot = process.cwd();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--write') mode = 'write';
    else if (a === '--validate') mode = 'validate';
    else if (a === '--write-and-validate') mode = 'write-and-validate';
    else if (a === '--repo-root' && i + 1 < argv.length) repoRoot = argv[++i];
    else if (a === '--help' || a === '-h') return null;
  }
  return { mode, repoRoot };
}

function help(): void {
  process.stdout.write(
    `gspl-bootstrap -- canonical registry bootstrap\n\n` +
    `Usage:\n  gspl-bootstrap [--write | --validate | --write-and-validate] [--repo-root <path>]\n`
  );
}

export async function main(argv: readonly string[]): Promise<number> {
  const opts = parseArgs(argv);
  if (!opts) { help(); return 64; }

  const inventionsPath = opts.repoRoot + '/canon/provenance/inventions.json';
  const sourcesPath = opts.repoRoot + '/canon/provenance/sources.json';
  const claimsPath = opts.repoRoot + '/canon/provenance/claims.json';
  const ledgerPath = opts.repoRoot + '/docs/canon/INVENTION_LEDGER.md';
  const provenanceRegPath = opts.repoRoot + '/docs/canon/PROVENANCE_REGISTRY.md';
  const claimsRegPath = opts.repoRoot + '/docs/canon/CLAIMS_REGISTER.md';

  if (opts.mode === 'write' || opts.mode === 'write-and-validate') {
    await writeAllRegistries({ inventionsPath, sourcesPath, claimsPath });
    writeInventionLedger(ledgerPath);
    writeProvenanceRegistry(provenanceRegPath);
    writeClaimsRegister(claimsRegPath);
    process.stderr.write('[gspl-bootstrap] registries + ledgers written\n');
  }

  if (opts.mode === 'validate' || opts.mode === 'write-and-validate') {
    if (!existsSync(inventionsPath)) {
      process.stderr.write('[gspl-bootstrap] validate failed: no inventions.json (run --write first)\n');
      return 2;
    }
    const report = checkLedgersVsJson({
      inventionsJson: inventionsPath,
      sourcesJson: sourcesPath,
      claimsJson: claimsPath,
      inventionLedger: ledgerPath,
      provenanceRegistry: provenanceRegPath,
      claimsRegister: claimsRegPath,
    });
    if (!report.ok) {
      process.stderr.write('[gspl-bootstrap] consistency: FAIL\n');
      return 2;
    }
    process.stderr.write('[gspl-bootstrap] consistency: PASS\n');
  }

  return 0;
}
