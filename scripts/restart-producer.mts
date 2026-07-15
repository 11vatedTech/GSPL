/** restart-producer.mts - separate-process IR + lock serializer (Prompt 2 Section 8)
 * argv[2] = fixtureId
 * argv[3] = outDir
 * Writes 3 files: <fixtureId>.ir.json, <fixtureId>.lock.json, <fixtureId>.expected.json
 * Replaces the in-Vitest 'restart' that previously called two functions in one process.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { createCompilerContext, runPipeline } from '@gspl/compiler-core';
import { canonicalizeSeed, computeSeedHash, type CanonicalSeed } from '@gspl/seed-format';
import {
  fixtureSoftwareArchitecture, fixtureInteractiveScene, fixtureMixedVideoGame,
  fixturePackageBacked, fixtureGeneExtension,
} from '../packages/compiler-core/src/fixtures.ts';

const fixtureId = process.argv[2];
const outDir = resolve(process.argv[3] || '.restart-out');
if (!fixtureId) { console.error('usage: restart-producer.mts <fixtureId> <outDir>'); process.exit(2); }
mkdirSync(outDir, { recursive: true });

const FIXTURES: Record<string, CanonicalSeed> = {
  'software-architecture': fixtureSoftwareArchitecture,
  'interactive-scene': fixtureInteractiveScene,
  'mixed-video-game': fixtureMixedVideoGame,
  'package-backed': fixturePackageBacked,
  'gene-extension': fixtureGeneExtension,
};
const seed = FIXTURES[fixtureId];
if (!seed) { console.error('unknown fixture: ' + fixtureId); process.exit(2); }

const ctx = createCompilerContext();
const result = runPipeline(ctx, seed);
if (!result.session.ir) { console.error('pipeline produced no IR'); process.exit(2); }

function stableStringify(v: unknown): string { return JSON.stringify(stableNormalise(v)); }
function stableNormalise(v: unknown): unknown {
  if (v === null) return null;
  const t = typeof v;
  if (t === 'string' || t === 'boolean') return v;
  if (t === 'number') { if (!Number.isFinite(v as number)) throw new Error('non-finite: ' + v); return v; }
  if (Array.isArray(v)) return v.map(stableNormalise);
  if (v instanceof Map) { const mv = v as Map<unknown, unknown>; const o: Record<string, unknown> = {}; for (const k of [...mv.keys()].sort()) o[String(k)] = stableNormalise(mv.get(k)); return o; }
  if (v instanceof Set) { return [...(v as Set<unknown>)].map(stableNormalise).sort((a, b) => { const sa = JSON.stringify(a); const sb = JSON.stringify(b); return sa < sb ? -1 : sa > sb ? 1 : 0; }); }
  if (t === 'object') { const ov = v as Record<string, unknown>; const o: Record<string, unknown> = {}; for (const k of Object.keys(ov).sort()) { const x = ov[k]; if (x === undefined) continue; o[k] = stableNormalise(x); } return o; }
  throw new Error('unsupported type: ' + t);
}

function sha256Hex(s: string): string { return 'sha256:' + createHash('sha256').update(s, 'utf8').digest('hex'); }
function lexCmp(a: unknown, b: unknown): number { const sa = JSON.stringify(a); const sb = JSON.stringify(b); return sa < sb ? -1 : sa > sb ? 1 : 0; }

const seedN = result.session.normalizedSeed || seed;
const deps = seedN.dependencies;
const lock = {
  schema: 'gspl.package-lock',
  schemaVersion: '1.0',
  dependencies: {
    contextRefs: (deps.contextRefs || []).map((r: { packageId: string; version: string; contentHash: string }) => ({ packageId: r.packageId, version: r.version, contentHash: r.contentHash })).sort(lexCmp),
    knowledgeRefs: (deps.knowledgeRefs || []).map((r: { packageId: string; version: string; contentHash: string }) => ({ packageId: r.packageId, version: r.version, contentHash: r.contentHash })).sort(lexCmp),
    ruleSetRefs: (deps.ruleSetRefs || []).map((r: { packageId: string; version: string; contentHash: string }) => ({ packageId: r.packageId, version: r.version, contentHash: r.contentHash })).sort(lexCmp),
    targetContracts: (deps.targetContracts || []).map((c: { targetId: string; targetType: string; requiredCapabilities: string[] }) => ({ targetId: c.targetId, targetType: c.targetType, requiredCapabilities: [...c.requiredCapabilities].sort() })).sort(lexCmp),
  },
};

const irSerialized = stableStringify(result.session.ir);
const originalBytes = canonicalizeSeed(seedN);
const originalBytesHash = sha256Hex(Buffer.from(originalBytes).toString('binary'));
const canonicalSeedHash = computeSeedHash(seedN);

writeFileSync(join(outDir, fixtureId + '.ir.json'), irSerialized + '\n', 'utf8');
writeFileSync(join(outDir, fixtureId + '.lock.json'), stableStringify(lock) + '\n', 'utf8');
writeFileSync(join(outDir, fixtureId + '.expected.json'), JSON.stringify({ fixtureId, canonicalSeedHash, canonicalSeedBytesHash: originalBytesHash }, null, 2) + '\n', 'utf8');
console.log('[restart-producer] wrote', fixtureId, 'to', outDir);
