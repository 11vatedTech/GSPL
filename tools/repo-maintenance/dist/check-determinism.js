import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
export function checkDeterminism(repoRoot) {
    const run = (cmd) => { try {
        execSync(cmd, { cwd: repoRoot, stdio: 'pipe' });
    }
    catch { } };
    const hash = (f, exclude) => {
        const obj = JSON.parse(readFileSync(f, 'utf-8'));
        exclude.forEach((k) => delete obj[k]);
        return 'sha256:' + createHash('sha256').update(JSON.stringify(obj)).digest('hex');
    };
    run('node tools/canon-bootstrap/dist/bin.js --write --repo-root ' + repoRoot);
    run('node tools/reference-indexer/dist/bin.js --config reference-manifest/repos.config.json --output reference-manifest/source-manifest.json');
    const h1 = {
        inventions: hash(repoRoot + '/canon/provenance/inventions.json', []),
        sources: hash(repoRoot + '/canon/provenance/sources.json', []),
        claims: hash(repoRoot + '/canon/provenance/claims.json', []),
        manifest: hash(repoRoot + '/reference-manifest/source-manifest.json', ['generatedAt', 'manifestHash']),
    };
    run('node tools/canon-bootstrap/dist/bin.js --write --repo-root ' + repoRoot);
    run('node tools/reference-indexer/dist/bin.js --config reference-manifest/repos.config.json --output reference-manifest/source-manifest.json');
    const h2 = {
        inventions: hash(repoRoot + '/canon/provenance/inventions.json', []),
        sources: hash(repoRoot + '/canon/provenance/sources.json', []),
        claims: hash(repoRoot + '/canon/provenance/claims.json', []),
        manifest: hash(repoRoot + '/reference-manifest/source-manifest.json', ['generatedAt', 'manifestHash']),
    };
    const keys = Object.keys(h1).sort();
    const ok = keys.every((k) => h1[k] === h2[k]);
    const report = { schema: 'gspl.determinism-report', schemaVersion: '1.0', generatedAt: new Date().toISOString(), deterministic: ok, comparedArtifacts: keys, round1: h1, round2: h2 };
    mkdirSync(repoRoot + '/canon/provenance', { recursive: true });
    writeFileSync(repoRoot + '/canon/provenance/determinism-report.json', JSON.stringify(report, null, 2) + '\n');
    return { ok, artifacts: keys };
}
export async function main(argv) {
    let repoRoot = process.cwd();
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--repo-root' && i + 1 < argv.length)
            repoRoot = argv[++i];
        else if (argv[i] === '--help' || argv[i] === '-h') {
            process.stdout.write('gspl-check-determinism [--repo-root <path>]\n');
            return 0;
        }
    }
    const result = checkDeterminism(repoRoot);
    process.stderr.write('Determinism (' + result.artifacts.length + ' artifacts): ' + (result.ok ? 'PASS' : 'FAIL') + '\n');
    return result.ok ? 0 : 2;
}
//# sourceMappingURL=check-determinism.js.map