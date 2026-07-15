import { createHash } from 'node:crypto';
const SCHEMA = 'gspl.reference-manifest';
const SCHEMA_VERSION = '1.0';
export function buildManifest(input) {
    const allFiles = [];
    for (const [, entries] of input.filesByRepo) {
        for (const e of entries)
            allFiles.push(e);
    }
    // Compute duplicates by contentHash.
    const byHash = new Map();
    for (const f of allFiles) {
        const g = byHash.get(f.contentHash) ?? [];
        g.push({ repo: f.repositoryId, path: f.relativePath, bytes: f.byteSize });
        byHash.set(f.contentHash, g);
    }
    const duplicates = [];
    for (const [sha256, files] of byHash) {
        if (files.length > 1)
            duplicates.push({ sha256, files });
    }
    duplicates.sort((a, b) => (a.sha256 < b.sha256 ? -1 : a.sha256 > b.sha256 ? 1 : 0));
    for (const d of duplicates) {
        d.files.sort((a, b) => a.repo < b.repo ? -1 : a.repo > b.repo ? 1 : a.path < b.path ? -1 : 1);
    }
    // Sort files deterministically.
    allFiles.sort((a, b) => {
        const r = a.repositoryId.localeCompare(b.repositoryId);
        return r !== 0 ? r : a.relativePath.localeCompare(b.relativePath);
    });
    const totalFiles = allFiles.length;
    const totalBytes = allFiles.reduce((s, f) => s + f.byteSize, 0);
    // Build statistics.
    const extCount = {};
    const langCount = {};
    const repoCount = {};
    let srcFiles = 0, testFiles = 0, docFiles = 0, cfgFiles = 0, genFiles = 0;
    for (const f of allFiles) {
        extCount[f.extension] = (extCount[f.extension] ?? 0) + 1;
        langCount[f.language] = (langCount[f.language] ?? 0) + 1;
        repoCount[f.repositoryId] = (repoCount[f.repositoryId] ?? 0) + 1;
        switch (f.category) {
            case 'source':
                srcFiles++;
                break;
            case 'test':
            case 'spec':
                testFiles++;
                break;
            case 'docs':
                docFiles++;
                break;
            case 'config':
                cfgFiles++;
                break;
        }
        if (f.isGenerated)
            genFiles++;
    }
    const manifestNoHash = {
        schema: SCHEMA,
        schemaVersion: SCHEMA_VERSION,
        repos: [...input.repos].sort((a, b) => a.id.localeCompare(b.id)),
        files: allFiles,
        duplicates,
        totalFiles,
        totalBytes,
        generatedAt: '',
    };
    const manifestHash = 'sha256:' + createHash('sha256')
        .update(JSON.stringify(manifestNoHash))
        .digest('hex');
    return { ...manifestNoHash, generatedAt: new Date().toISOString(), manifestHash };
}
export function buildStatistics(files) {
    const extCount = {};
    const langCount = {};
    const repoCount = {};
    let srcFiles = 0, testFiles = 0, docFiles = 0, cfgFiles = 0, genFiles = 0;
    for (const f of files) {
        extCount[f.extension] = (extCount[f.extension] ?? 0) + 1;
        langCount[f.language] = (langCount[f.language] ?? 0) + 1;
        repoCount[f.repositoryId] = (repoCount[f.repositoryId] ?? 0) + 1;
        switch (f.category) {
            case 'source':
                srcFiles++;
                break;
            case 'test':
            case 'spec':
                testFiles++;
                break;
            case 'docs':
                docFiles++;
                break;
            case 'config':
                cfgFiles++;
                break;
        }
        if (f.isGenerated)
            genFiles++;
    }
    return {
        totalFiles: files.length,
        totalBytes: files.reduce((s, f) => s + f.byteSize, 0),
        filesByRepo: repoCount,
        filesByExtension: extCount,
        filesByLanguage: langCount,
        sourceFiles: srcFiles,
        testFiles,
        documentationFiles: docFiles,
        configurationFiles: cfgFiles,
        generatedFiles: genFiles,
        excludedEntries: 0,
        unreadableEntries: 0,
        duplicateGroups: 0,
        nearDuplicateGroups: 0,
    };
}
export function serializeManifest(m) {
    return JSON.stringify(m, null, 2) + '\n';
}
//# sourceMappingURL=manifest.js.map