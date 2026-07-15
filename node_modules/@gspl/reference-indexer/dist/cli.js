import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { scanRepo } from './scanner.js';
import { buildManifest, serializeManifest } from './manifest.js';
function parseArgs(argv) {
    let configPath;
    let outputPath;
    const repoRoot = process.cwd();
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--config' && i + 1 < argv.length)
            configPath = argv[++i];
        else if (a === '--output' && i + 1 < argv.length)
            outputPath = argv[++i];
        else if (a === '--repo-root' && i + 1 < argv.length) { /* accept but not used for resolution — paths in config are repo-relative */ }
        else if (a === '--help' || a === '-h')
            return null;
    }
    if (!configPath || !outputPath)
        return null;
    return { configPath, outputPath, repoRoot };
}
function help() {
    process.stdout.write(`gspl-index — deterministic reference repository indexer\n\n` +
        `Usage:\n  gspl-index --config <repos.json> --output <manifest.json>\n\n` +
        `Options:\n` +
        `  --config     JSON file with shape { "repos": [{ "id", "name", "sourceType", "source" }] }\n` +
        `  --output     Output file path for the SourceManifest JSON.\n` +
        `  --repo-root  Repository root for resolving relative paths (default: cwd).\n`);
}
export async function main(argv) {
    const opts = parseArgs(argv);
    if (!opts) {
        help();
        return 64;
    }
    const fs = await import('node:fs/promises');
    const configText = await fs.readFile(opts.configPath, 'utf-8');
    const raw = JSON.parse(configText);
    // Keep original (repo-relative) paths for the manifest. Resolve for scanning only.
    const manifestRepos = raw.repos.map((r) => ({
        id: r.id,
        name: r.name,
        sourceType: r.sourceType ?? 'directory',
        source: r.source,
        description: r.description,
    }));
    const filesByRepo = new Map();
    for (const r of raw.repos) {
        const resolvedSource = r.source.startsWith('.') || !r.source.includes(':')
            ? resolve(opts.repoRoot, r.source)
            : r.source;
        const repo = {
            id: r.id, name: r.name,
            sourceType: r.sourceType ?? 'directory',
            source: resolvedSource,
            description: r.description,
        };
        process.stderr.write(`[gspl-index] scanning ${repo.id} (${resolvedSource})\n`);
        const result = await scanRepo(repo);
        filesByRepo.set(repo.id, result.files);
    }
    const manifest = buildManifest({ repos: manifestRepos, filesByRepo });
    const serialized = serializeManifest(manifest);
    await mkdir(dirname(opts.outputPath), { recursive: true });
    await writeFile(opts.outputPath, serialized, 'utf-8');
    process.stderr.write(`[gspl-index] wrote ${opts.outputPath}\n` +
        `[gspl-index]   ${manifest.totalFiles} files, ${manifest.totalBytes} bytes\n` +
        `[gspl-index]   ${manifest.duplicates.length} duplicate groups\n`);
    // Fail if zero files — per §4 the manifest must contain real file records.
    return manifest.totalFiles === 0 ? 2 : 0;
}
// Entry point: explicit main(argv) called only from the bin entry.
// No import-time side-effects or brittle argv[1] heuristics.
//# sourceMappingURL=cli.js.map