import { readFile } from 'node:fs/promises';
import { join, sep } from 'node:path';
import { DirectorySource, ZipArchiveSource } from './zip-source.js';
import { extractSymbols, canExtractSymbols } from './symbols.js';
export { DirectorySource, ZipArchiveSource } from './zip-source.js';
function sourceFor(repo) {
    return repo.sourceType === 'zip' ? new ZipArchiveSource() : new DirectorySource();
}
export async function scanRepo(repo) {
    const source = sourceFor(repo);
    let files = await source.scan(repo);
    const enriched = [];
    for (const f of files) {
        if (canExtractSymbols(f.extension)) {
            try {
                const absPath = repo.sourceType === 'zip'
                    ? f.relativePath
                    : join(repo.source, f.relativePath.split('/').join(sep));
                if (repo.sourceType !== 'zip') {
                    const raw = await readFile(absPath, 'utf-8');
                    const result = extractSymbols(raw, f.language);
                    enriched.push({ ...f, symbolIndexStatus: result.status, symbols: result.symbols });
                }
                else {
                    enriched.push(f);
                }
            }
            catch {
                enriched.push(f);
            }
        }
        else {
            enriched.push(f);
        }
    }
    return { repo, files: enriched };
}
export function pathSegments(absPath) {
    return absPath.split(sep).filter(Boolean);
}
//# sourceMappingURL=scanner.js.map