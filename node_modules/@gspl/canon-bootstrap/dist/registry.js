import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { INVENTIONS } from './inventions/index.js';
import { SOURCES } from './sources/index.js';
import { CLAIMS } from './claims/index.js';
import { BOOTSTRAP_TIMESTAMP, stableStringify } from './serialize.js';
export function writeInventionRegistry(path) {
    const reg = {
        schema: 'gspl.invention-ledger',
        schemaVersion: '1.0',
        generatedAt: BOOTSTRAP_TIMESTAMP,
        inventions: [...INVENTIONS].sort((a, b) => (a.id < b.id ? -1 : 1))
    };
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, stableStringify(reg), 'utf-8');
}
export function writeSourceRegistry(path) {
    const reg = {
        schema: 'gspl.sources',
        schemaVersion: '1.0',
        generatedAt: BOOTSTRAP_TIMESTAMP,
        sources: [...SOURCES].sort((a, b) => (a.sourceId < b.sourceId ? -1 : 1))
    };
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, stableStringify(reg), 'utf-8');
}
export function writeClaimRegistry(path) {
    const reg = {
        schema: 'gspl.claims',
        schemaVersion: '1.0',
        generatedAt: BOOTSTRAP_TIMESTAMP,
        claims: [...CLAIMS].sort((a, b) => (a.claimId < b.claimId ? -1 : 1))
    };
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, stableStringify(reg), 'utf-8');
}
export function writeAllRegistries(paths) {
    writeInventionRegistry(paths.inventionsPath);
    writeSourceRegistry(paths.sourcesPath);
    writeClaimRegistry(paths.claimsPath);
}
//# sourceMappingURL=registry.js.map