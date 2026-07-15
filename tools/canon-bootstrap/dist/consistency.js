/**
 * Consistency check: confirms JSON-id <-> MD-id alignment and that
 * the determinism invariant (byte-equality) holds between in-memory regen
 * and committed files.
 */
import { readFileSync, existsSync } from 'node:fs';
import { INVENTIONS } from './inventions/index.js';
import { SOURCES } from './sources/index.js';
import { CLAIMS } from './claims/index.js';
import { BOOTSTRAP_TIMESTAMP, stableStringify } from './serialize.js';
function mentions(content, id) {
    return content.indexOf(id) !== -1;
}
function hashOf(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++)
        h = (h * 31 + s.charCodeAt(i)) & 0xffffffff;
    return h;
}
export function checkLedgersVsJson(paths) {
    const mismatches = [];
    const inventionsReg = {
        schema: 'gspl.invention-ledger',
        schemaVersion: '1.0',
        generatedAt: BOOTSTRAP_TIMESTAMP,
        inventions: [...INVENTIONS].sort((a, b) => (a.id < b.id ? -1 : 1))
    };
    const sourcesReg = {
        schema: 'gspl.sources',
        schemaVersion: '1.0',
        generatedAt: BOOTSTRAP_TIMESTAMP,
        sources: [...SOURCES].sort((a, b) => (a.sourceId < b.sourceId ? -1 : 1))
    };
    const claimsReg = {
        schema: 'gspl.claims',
        schemaVersion: '1.0',
        generatedAt: BOOTSTRAP_TIMESTAMP,
        claims: [...CLAIMS].sort((a, b) => (a.claimId < b.claimId ? -1 : 1))
    };
    const invText = stableStringify(inventionsReg);
    const srcText = stableStringify(sourcesReg);
    const claText = stableStringify(claimsReg);
    if (existsSync(paths.inventionsJson) && readFileSync(paths.inventionsJson, 'utf-8') !== invText)
        mismatches.push('inventions.json differs from in-memory regen');
    if (existsSync(paths.sourcesJson) && readFileSync(paths.sourcesJson, 'utf-8') !== srcText)
        mismatches.push('sources.json differs from in-memory regen');
    if (existsSync(paths.claimsJson) && readFileSync(paths.claimsJson, 'utf-8') !== claText)
        mismatches.push('claims.json differs from in-memory regen');
    if (existsSync(paths.inventionLedger)) {
        const md = readFileSync(paths.inventionLedger, 'utf-8');
        for (const inv of inventionsReg.inventions)
            if (!mentions(md, inv.id))
                mismatches.push('invention ledger missing ' + inv.id);
    }
    if (existsSync(paths.provenanceRegistry)) {
        const md = readFileSync(paths.provenanceRegistry, 'utf-8');
        for (const s of sourcesReg.sources)
            if (!mentions(md, s.sourceId))
                mismatches.push('provenance registry missing ' + s.sourceId);
    }
    if (existsSync(paths.claimsRegister)) {
        const md = readFileSync(paths.claimsRegister, 'utf-8');
        for (const c of claimsReg.claims)
            if (!mentions(md, c.claimId))
                mismatches.push('claims register missing ' + c.claimId);
    }
    return {
        ok: mismatches.length === 0,
        mismatches,
        determinism: {
            inventionsChecksum: hashOf(invText),
            sourcesChecksum: hashOf(srcText),
            claimsChecksum: hashOf(claText)
        }
    };
}
//# sourceMappingURL=consistency.js.map