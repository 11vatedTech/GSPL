import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { classify } from './classifier.js';
function parseArgs(argv) {
    let claims;
    let rpt;
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--claims' && i + 1 < argv.length)
            claims = argv[++i];
        else if (a === '--report' && i + 1 < argv.length)
            rpt = argv[++i];
        else if (a === '--help' || a === '-h')
            return null;
    }
    if (!claims)
        return null;
    rpt = rpt ?? 'canon/provenance/claim-classification-report.json';
    return { claimsPath: claims, reportPath: rpt };
}
function help() {
    process.stdout.write(`gspl-classify -- claim classifier for the GSPL canon\n\n` +
        `Usage:\n  gspl-classify --claims <file> [--report <file>]\n`);
}
export async function main(argv) {
    const opts = parseArgs(argv);
    if (!opts) {
        help();
        return 64;
    }
    const raw = JSON.parse(readFileSync(opts.claimsPath, 'utf-8'));
    const report = classify(raw);
    mkdirSync(dirname(opts.reportPath), { recursive: true });
    writeFileSync(opts.reportPath, JSON.stringify(report, null, 2) + '\n', 'utf-8');
    process.stderr.write(`[gspl-classify] claims checked: ${report.summary.claimsChecked}\n` +
        `[gspl-classify] status: ${report.ok ? 'PASS' : 'FAIL'}\n`);
    return report.ok ? 0 : 2;
}
//# sourceMappingURL=cli.js.map