/** write-canonical-manifest.mts \u2014 deterministic manifest for CI hash-compare
 * Writes artifacts/validation/canonical-manifest.json + .sha256 from controlled inputs
 * (package version + git SHA + compiler/canon version + ordered check-list). Both files
 * are byte-equal across OS + Node combinations because the inputs are version-controlled. */
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const ROOT = resolve(process.argv[2] || '.');
const OUT_DIR = join(ROOT, 'artifacts', 'validation');
mkdirSync(OUT_DIR, { recursive: true });

let gitSha = 'no-git';
try { gitSha = execSync('git rev-parse HEAD', { cwd: ROOT, encoding: 'utf8' }).trim(); } catch (e) { /* offline fallback */ }
let pkgVersion = '0.0.0';
try { const p = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')); pkgVersion = p.version || '0.0.0'; } catch (e) { /* parse failure */ }

const manifest = {
  schema: 'gspl.canonical-manifest',
  schemaVersion: '1.0',
  generatedAt: 'deterministic',
  packageVersion: pkgVersion,
  gitSha: gitSha,
  compilerVersion: '0.1.0',
  canonVersion: '1.0',
  checks: ['typecheck:all','build','test','test:property','test:fuzz:ci','test:mutation:ci','fixtures:generate','check:roundtrip','check:restart-reconstruction','check:packages','check:determinism','check:conformance','check:clean-source','validate','package:source','check:source-archive'],
};

const json = JSON.stringify(manifest, null, 2);
writeFileSync(join(OUT_DIR, 'canonical-manifest.json'), json, 'utf8');
writeFileSync(join(OUT_DIR, 'canonical-manifest.sha256'), 'sha256:' + createHash('sha256').update(json).digest('hex'), 'utf8');
console.log('wrote', OUT_DIR, 'hash=', 'sha256:' + createHash('sha256').update(json).digest('hex'));
