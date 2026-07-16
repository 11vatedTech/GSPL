/**
 * check-tracked-source.mts — inspect git ls-files for forbidden tracked paths
 * (Prompt 2 §10).
 */
import { spawnSync } from 'node:child_process';
import { stableStringify } from './lib/canonical-stringify.mts';

const FORBIDDEN = [
  { pattern: /node_modules\//, description: 'node_modules tracked' },
  { pattern: /\bdist\//, description: 'dist tracked' },
  { pattern: /\.tsbuildinfo$/, description: 'tsbuildinfo tracked' },
  { pattern: /coverage\//, description: 'coverage tracked' },
  { pattern: /\.vite\//, description: '.vite tracked' },
  { pattern: /\.cache\//, description: '.cache tracked' },
  { pattern: /\bbuild\//, description: 'build/ tracked' },
  { pattern: /\.turbo\//, description: '.turbo tracked' },
  { pattern: /artifacts\/validation\/restart-/, description: 'artifacts/validation/restart-* tracked' },
  { pattern: /artifacts\/validation\/runtime-/, description: 'artifacts/validation/runtime-* tracked' },
  { pattern: /artifacts\/validation\/tmp-/, description: 'artifacts/validation/tmp-* tracked' },
];

const r = spawnSync('git', ['ls-files'], { encoding: 'utf8' });
if (r.status !== 0) { console.error("git ls-files failed"); process.exit(2); }
const gitFiles = r.stdout.split('\n').filter((f) => f.length > 0);

const violations = [];
for (const f of gitFiles) {
  for (const rule of FORBIDDEN) {
    if (rule.pattern.test(f)) { violations.push({ path: f, reason: rule.description }); break; }
  }
}

const out = {
  schema: 'gspl.tracked-source-check-report',
  schemaVersion: '1.0',
  totalTracked: gitFiles.length,
  violationCount: violations.length,
  violations,
  ok: violations.length === 0,
};
process.stdout.write(stableStringify(out) + '\n');
if (violations.length > 0) process.exit(1);
