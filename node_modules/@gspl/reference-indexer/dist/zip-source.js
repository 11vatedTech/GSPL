/**
 * ReferenceSource abstraction with DirectorySource and ZipArchiveSource.
 *
 * §1 — the scanner supports both directory and ZIP-archive reference
 * repositories. Both sources produce identical ReferenceFileRecord shapes.
 */
import { readdir, stat } from 'node:fs/promises';
import { join, relative, extname, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { shouldExcludeDir, shouldExcludeFile, classifyFile, normalizePath } from './policy.js';
import { hashFile } from './hasher.js';
function languageFromExt(ext) {
    const m = {
        '.ts': 'TypeScript', '.tsx': 'TypeScript', '.js': 'JavaScript', '.jsx': 'JavaScript',
        '.mjs': 'JavaScript', '.cjs': 'JavaScript', '.py': 'Python', '.rs': 'Rust',
        '.go': 'Go', '.java': 'Java', '.kt': 'Kotlin', '.swift': 'Swift',
        '.c': 'C', '.cc': 'C++', '.cpp': 'C++', '.h': 'C', '.hpp': 'C++',
        '.cs': 'C#', '.fs': 'F#', '.lua': 'Lua', '.rb': 'Ruby', '.php': 'PHP',
        '.sh': 'Shell', '.ps1': 'PowerShell', '.bat': 'Batch', '.cmd': 'Batch',
        '.sql': 'SQL', '.graphql': 'GraphQL', '.proto': 'Protobuf',
        '.json': 'JSON', '.yaml': 'YAML', '.yml': 'YAML', '.toml': 'TOML', '.xml': 'XML',
        '.md': 'Markdown', '.mdx': 'Markdown', '.txt': 'Text', '.rst': 'reStructuredText',
        '.html': 'HTML', '.css': 'CSS', '.scss': 'SCSS', '.less': 'Less',
        '.glsl': 'GLSL', '.vert': 'GLSL', '.frag': 'GLSL', '.comp': 'GLSL',
        '.hlsl': 'HLSL', '.wgsl': 'WGSL', '.shader': 'Shader',
        '.vue': 'Vue', '.svelte': 'Svelte',
        '.wat': 'WebAssembly', '.mlir': 'MLIR',
        '.gspl': 'GSPL', '.gseed': 'GSPL',
    };
    return m[ext.toLowerCase()] ?? 'Unknown';
}
function buildRecord(repo, relPath, classification, hashed) {
    const ext = extname(basename(relPath)).toLowerCase();
    const isBinary = classification === 'binary';
    const isTest = classification === 'test' || classification === 'spec';
    const isDoc = classification === 'docs';
    return {
        sourceUri: repo.sourceType === 'zip' ? `archive://${repo.id}!/${relPath}` : relPath,
        repositoryId: repo.id, relativePath: relPath,
        extension: ext, language: languageFromExt(ext), category: classification,
        contentHash: hashed.sha256, byteSize: hashed.bytes, lineCount: hashed.lines,
        isTest, isDocumentation: isDoc, isGenerated: false, isBuildArtifact: isBinary,
        symbolIndexStatus: 'not-indexed', scanPolicyVersion: '1.0',
    };
}
export class DirectorySource {
    async scan(repo) {
        const sourcePath = repo.source;
        const stats = await stat(sourcePath).catch(() => null);
        if (!stats || !stats.isDirectory())
            return [];
        const records = [];
        let excluded = 0, unreadable = 0;
        const walk = async (absDir) => {
            let entries;
            try {
                entries = await readdir(absDir);
                entries.sort();
            }
            catch {
                return;
            }
            for (const entry of entries) {
                const absChild = join(absDir, entry);
                const childStat = await stat(absChild).catch(() => { unreadable++; return null; });
                if (!childStat)
                    continue;
                if (childStat.isDirectory()) {
                    if (shouldExcludeDir(entry)) {
                        excluded++;
                        continue;
                    }
                    await walk(absChild);
                }
                else if (childStat.isFile()) {
                    if (shouldExcludeFile(entry)) {
                        excluded++;
                        continue;
                    }
                    const relPath = normalizePath(relative(sourcePath, absChild));
                    const classification = classifyFile(relPath);
                    if (classification === 'binary' && childStat.size > 10 * 1024 * 1024) {
                        excluded++;
                        continue;
                    }
                    const hashed = await hashFile(absChild, relPath);
                    records.push(buildRecord(repo, relPath, classification, hashed));
                }
            }
        };
        await walk(sourcePath);
        records.sort((a, b) => a.relativePath < b.relativePath ? -1 : a.relativePath > b.relativePath ? 1 : 0);
        process.stderr.write(`[gspl-index]   ${repo.id}: ${records.length} files, ${excluded} excluded, ${unreadable} unreadable\n`);
        return records;
    }
}
const ZIP_SLIP_SEGMENTS = new Set(['..', '.']);
export class ZipArchiveSource {
    async scan(repo) {
        const yauzl = await import('yauzl');
        const zipPath = repo.source;
        const stats = await stat(zipPath).catch(() => null);
        if (!stats || !stats.isFile()) {
            process.stderr.write(`[gspl-index]   ${repo.id}: ZIP not found at ${zipPath}\n`);
            return [];
        }
        let excluded = 0, rejected = 0, corrupted = 0;
        const records = [];
        return new Promise((resolve, reject) => {
            yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
                if (err) {
                    reject(err);
                    return;
                }
                if (!zipfile) {
                    resolve([]);
                    return;
                }
                zipfile.on('error', reject);
                zipfile.readEntry();
                zipfile.on('entry', (entry) => {
                    const rawPath = entry.fileName;
                    const normalized = rawPath.split(String.fromCharCode(92)).join('/');
                    if (normalized.startsWith('/')) {
                        rejected++;
                        zipfile.readEntry();
                        return;
                    }
                    const segments = normalized.split('/');
                    if (segments.some((s) => ZIP_SLIP_SEGMENTS.has(s))) {
                        rejected++;
                        zipfile.readEntry();
                        return;
                    }
                    if (entry.fileName.endsWith('/') || entry.fileName.endsWith(String.fromCharCode(92))) {
                        zipfile.readEntry();
                        return;
                    }
                    const dirParts = segments.slice(0, -1);
                    const base = segments[segments.length - 1];
                    if (dirParts.some((d) => shouldExcludeDir(d))) {
                        excluded++;
                        zipfile.readEntry();
                        return;
                    }
                    if (shouldExcludeFile(base)) {
                        excluded++;
                        zipfile.readEntry();
                        return;
                    }
                    const classification = classifyFile(normalized);
                    zipfile.openReadStream(entry, (streamErr, stream) => {
                        if (streamErr) {
                            corrupted++;
                            zipfile.readEntry();
                            return;
                        }
                        if (!stream) {
                            zipfile.readEntry();
                            return;
                        }
                        const chunks = [];
                        stream.on('data', (chunk) => chunks.push(chunk));
                        stream.on('end', () => {
                            const raw = Buffer.concat(chunks);
                            const h = createHash('sha256');
                            let bytes;
                            let lines = 0;
                            if (classification === 'binary') {
                                h.update(raw);
                                bytes = raw.length;
                            }
                            else {
                                const td = new TextDecoder('utf-8', { fatal: false });
                                let start = 0;
                                if (raw.length >= 3 && raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf)
                                    start = 3;
                                let text = td.decode(raw.subarray(start));
                                text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
                                const tb = new TextEncoder().encode(text);
                                h.update(tb);
                                bytes = tb.length;
                                if (text.length > 0) {
                                    lines = text.split('\n').length;
                                    if (text.endsWith('\n'))
                                        lines -= 1;
                                }
                            }
                            records.push(buildRecord(repo, normalized, classification, { sha256: h.digest('hex'), bytes, lines }));
                            zipfile.readEntry();
                        });
                        stream.on('error', () => { corrupted++; zipfile.readEntry(); });
                    });
                });
                zipfile.on('end', () => {
                    records.sort((a, b) => a.relativePath < b.relativePath ? -1 : a.relativePath > b.relativePath ? 1 : 0);
                    process.stderr.write(`[gspl-index]   ${repo.id}: ${records.length} files, ${excluded} excluded, ${rejected} rejected, ${corrupted} corrupted\n`);
                    resolve(records);
                });
            });
        });
    }
}
//# sourceMappingURL=zip-source.js.map