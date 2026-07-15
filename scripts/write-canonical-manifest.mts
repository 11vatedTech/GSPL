/** write-canonical-manifest.mts — per-fixture CanonicalOutputManifest writer
 *
 * Computes 10 deterministic hashes per fixture from real pipeline outputs:
 *   canonicalSeedHash, canonicalSeedBytesHash, irHash, expansionPlanHash,
 *   artifactGraphHash, packageLockHash, canonicalDiagnosticsHash,
 *   canonicalProvenanceHash, reconstructedSeedHash, reconstructedBytesHash
 *
 * Schema: gspl.canonical-output-manifest v1.0.
 * Manifest is byte-equal across OS + Node combinations because every hash
 * derives from fixture content + compiler/canon versions (no wall-clock,
 * no absolute paths, no hostname, no PID).
 *
 * Must run after `npm run build` (workspace dist/) so the workspace import
 * `@gspl/compiler-core` resolves to compiled output.
 *
 * Pipeline:
 *   1. For each of the 5 fixtures (software-architecture, interactive-scene,
 *      mixed-video-game, package-backed, gene-extension):
 *        a. computeSeedHash + canonicalizeSeed (for original canonical bytes)
 *        b. runPipeline (for IR / plan / artifactGraph / diagnostics / provenance)
 *        c. synthesize package lock from dependencies
 *        d. deterministic stringify + sha256
 *        e. reconstructSeedFromIr (in the SAME process, to record baseline
 *           reconstructed hash pair; SEPARATE-process consumer re-runs and compares)
 *   2. Sort fixtures by fixtureId lexically before serialisation so the
 *      manifest byte sequence is reproducible independent of regeneration order.
 *   3. manifestHash = sha256 of the manifest body BEFORE the hash field,
 *      so each reader can independently verify.
 *
 * Wall-clock fields, working directory, OS name, Node version, process ID,
 * temporary paths, execution durations are EXPLICITLY excluded from the
 * hash-compared canonical manifest. Operational environment data which is
 * non-canonical (e.g. generatedAt, runnerIdentities) is kept separate and
 * not part of manifestHash coverage.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

// Workspace package import — MUST run after `npm run build` so dist/index.js
// is the compiled output. Fail loudly if dist is stale.
import {
  createCompilerContext,
  runPipeline,
  reconstructSeedFromIr,
  verifyIndependentReconstruction,
} from '@gspl/compiler-core';
import { canonicalizeSeed, computeSeedHash } from '@gspl/seed-format';
import type { CanonicalSeed } from '@gspl/seed-format';
import type { Diagnostic, GsplIrGraph, GsplIrNode, ProvenanceChain } from '@gspl/ir-model';

// Direct source import for new fixtures not yet reflected in dist/index.js.
// Under `node --experimental-strip-types`, `".../fixtures.ts"` is honoured.
import {
  fixtureSoftwareArchitecture,
  fixtureInteractiveScene,
  fixtureMixedVideoGame,
  fixturePackageBacked,
  fixtureGeneExtension,
} from '../packages/compiler-core/src/fixtures.ts';

// ─── Argv + constants ──────────────────────────────────────────────────────

const ROOT = resolve(process.argv[2] || '.');
const OUT_FILE = join(ROOT, 'artifacts', 'validation', 'canonical-output-manifest.json');
const OUT_HASH = OUT_FILE + '.sha256';
mkdirSync(resolve(OUT_FILE, '..'), { recursive: true });

const FIXTURES: ReadonlyArray<readonly [string, CanonicalSeed]> = [
  ['gene-extension', fixtureGeneExtension],
  ['interactive-scene', fixtureInteractiveScene],
  ['mixed-video-game', fixtureMixedVideoGame],
  ['package-backed', fixturePackageBacked],
  ['software-architecture', fixtureSoftwareArchitecture],
];

// ─── Deterministic serialisation helpers ──────────────────────────────────

/** Stable JSON canonicalisation for hashing pipeline outputs.
 *  - Object keys sorted lexically
 *  - Map → sorted-by-key [k,v] entries
 *  - Set → sorted-by-element array
 *  - Arrays preserve insertion order
 *  - BigInt / undefined / function → throw (must not appear in canonical data) */
function stableStringify(value: unknown): string {
  return JSON.stringify(stableNormalise(value));
}

function stableNormalise(value: unknown): unknown {
  if (value === null) return null;
  const t = typeof value;
  if (t === 'string' || t === 'boolean') return value;
  if (t === 'number') {
    if (!Number.isFinite(value as number)) {
      throw new Error('stableNormalise: non-finite number not allowed in canonical form: ' + String(value));
    }
    return value;
  }
  if (Array.isArray(value)) return value.map(stableNormalise);
  if (value instanceof Map) {
    const obj: Record<string, unknown> = {};
    const sortedKeys = [...value.keys()].sort();
    for (const k of sortedKeys) obj[String(k)] = stableNormalise(value.get(k));
    return obj;
  }
  if (value instanceof Set) {
    return [...value].map(stableNormalise).sort(lexicalCompare);
  }
  if (t === 'object') {
    const obj = value as Record<string, unknown>;
    const sortedKeys = Object.keys(obj).sort();
    const out: Record<string, unknown> = {};
    for (const k of sortedKeys) {
      const v = obj[k];
      if (v === undefined) continue;
      out[k] = stableNormalise(v);
    }
    return out;
  }
  throw new Error('stableNormalise: unsupported canonical type: ' + t);
}

function lexicalCompare(a: unknown, b: unknown): number {
  const sa = JSON.stringify(a);
  const sb = JSON.stringify(b);
  if (sa < sb) return -1;
  if (sa > sb) return 1;
  return 0;
}

function sha256Hex(s: string): string {
  return 'sha256:' + createHash('sha256').update(s, 'utf8').digest('hex');
}

// ─── Per-fixture hashing ───────────────────────────────────────────────────

interface FixtureRecord {
  readonly fixtureId: string;
  readonly canonicalSeedHash: string;
  readonly canonicalSeedBytesHash: string;
  readonly irHash: string;
  readonly expansionPlanHash: string;
  readonly artifactGraphHash: string;
  readonly packageLockHash: string;
  readonly canonicalDiagnosticsHash: string;
  readonly canonicalProvenanceHash: string;
  readonly reconstructedSeedHash: string;
  readonly reconstructedBytesHash: string;
}

function synthesizePackageLock(seed: CanonicalSeed): unknown {
  // Deterministic projection of dependencies that participate in canonical
  // package resolution. Sort all arrays lexicographically and exclude
  // non-canonical fields (e.g. authorId overrides, runtime-only metadata).
  const deps = seed.dependencies;
  const ctxRefs = (deps.contextRefs ?? [])
    .map((r) => ({ packageId: r.packageId, version: r.version, contentHash: r.contentHash }))
    .sort(lexicalCompare);
  const ruleRefs = (deps.ruleSetRefs ?? [])
    .map((r) => ({ packageId: r.packageId, version: r.version, contentHash: r.contentHash }))
    .sort(lexicalCompare);
  const knowRefs = (deps.knowledgeRefs ?? [])
    .map((r) => ({ packageId: r.packageId, version: r.version, contentHash: r.contentHash }))
    .sort(lexicalCompare);
  const targetContracts = (deps.targetContracts ?? [])
    .map((c) => ({ targetId: c.targetId, targetType: c.targetType, requiredCapabilities: [...c.requiredCapabilities].sort() }))
    .sort(lexicalCompare);
  return {
    schema: 'gspl.package-lock',
    schemaVersion: '1.0',
    dependencies: { contextRefs: ctxRefs, knowledgeRefs: knowRefs, ruleSetRefs: ruleRefs, targetContracts },
  };
}

function hashDiagnostics(diags: readonly Diagnostic[]): string {
  return sha256Hex(stableStringify(diags.map((d) => ({
    code: d.code, severity: d.severity, category: d.category, message: d.message,
  })).sort(lexicalCompare)));
}

function hashProvenance(provenance: readonly { id: string; producedEntity: { id: string; type: string }; consumedEntities: readonly { id: string; type: string }[] }[]): string {
  return sha256Hex(stableStringify(provenance.map((p) => ({
    id: p.id,
    producedEntity: p.producedEntity,
    consumedEntityIds: [...p.consumedEntities.map((c) => c.id)].sort(),
  })).sort(lexicalCompare)));
}

function buildFixtureRecord(
  fixtureId: string,
  seed: CanonicalSeed,
  graph: GsplIrGraph,
  plan: unknown,
  artifactGraph: unknown,
  diagnostics: readonly Diagnostic[],
  provenance: readonly { id: string; producedEntity: { id: string; type: string }; consumedEntities: readonly { id: string; type: string }[] }[],
): FixtureRecord {
  const canonicalSeedHash = computeSeedHash(seed);
  const canonicalSeedBytesHash = sha256Hex(Buffer.from(canonicalizeSeed(seed)).toString('binary'));
  const irHash = sha256Hex(stableStringify(graph));
  const expansionPlanHash = sha256Hex(stableStringify(plan));
  const artifactGraphHash = sha256Hex(stableStringify(artifactGraph));
  const packageLockHash = sha256Hex(stableStringify(synthesizePackageLock(seed)));
  const canonicalDiagnosticsHash = hashDiagnostics(diagnostics);
  const canonicalProvenanceHash = hashProvenance(provenance);

  // Same-process reconstruction — records the baseline comparison pair. The
  // SEPARATE-process consumer (restart-consumer.mts) re-runs reconstruction
  // independently and must produce the same hash pair.
  const ctx = createCompilerContext();
  const reconResult = reconstructSeedFromIr(graph, {
    geneRegistry: ctx.geneRegistry,
    compilerVersion: ctx.compilerVersion,
    canonVersion: ctx.canonVersion,
    schemaRegistry: { 'gspl.canonical-seed': '1.0' },
    limits: { maxGenes: 1000, maxConstraints: 1000, maxDependencies: 1000 },
  });
  const reconstructedSeedHash = computeSeedHash(reconResult.seed);
  const reconstructedBytesHash = sha256Hex(Buffer.from(canonicalizeSeed(reconResult.seed)).toString('binary'));

  // Independent verification using original canonical bytes — proves
  // reconstruction ends up byte-equal to original canonicalisation.
  const originalBytes = canonicalizeSeed(seed);
  const verification = verifyIndependentReconstruction(originalBytes, graph, {
    geneRegistry: ctx.geneRegistry,
    compilerVersion: ctx.compilerVersion,
    canonVersion: ctx.canonVersion,
    limits: { maxGenes: 1000, maxConstraints: 1000, maxDependencies: 1000 },
  });
  if (!verification.ok) {
    throw new Error('Fixture ' + fixtureId + ' failed independent verification in same-process baseline: ' + JSON.stringify(verification.errors));
  }

  return {
    fixtureId,
    canonicalSeedHash,
    canonicalSeedBytesHash,
    irHash,
    expansionPlanHash,
    artifactGraphHash,
    packageLockHash,
    canonicalDiagnosticsHash,
    canonicalProvenanceHash,
    reconstructedSeedHash,
    reconstructedBytesHash,
  };
}

// ─── Build manifest ────────────────────────────────────────────────────────

function gitShaOrEmpty(): string {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

const compilerCoreContext = createCompilerContext();
const fixtureRecords: FixtureRecord[] = [];

for (const [fixtureId, seed] of FIXTURES) {
  const result = runPipeline(compilerCoreContext, seed);
  if (!result.session.ir || !result.session.plan || !result.session.artifactGraph) {
    throw new Error('Pipeline produced empty output for fixture ' + fixtureId);
  }
  const rec = buildFixtureRecord(
    fixtureId,
    result.session.normalizedSeed ?? seed,
    result.session.ir,
    result.session.plan,
    result.session.artifactGraph,
    result.session.diagnostics,
    result.session.provenance,
  );
  fixtureRecords.push(rec);
}

// Sort records lexically by fixtureId (Fixtures array was already sorted by name).
fixtureRecords.sort((a, b) => a.fixtureId < b.fixtureId ? -1 : a.fixtureId > b.fixtureId ? 1 : 0);

// Non-canonical environment data (separate from manifestHash coverage).
const environmentRecord = {
  generatedAt: new Date().toISOString(),
  sourceCommit: gitShaOrEmpty(),
  runnerPlatform: process.platform,
  runnerNodeVersion: process.version,
  runnerPid: process.pid,
  runnerCwd: process.cwd(),
};

interface CanonicalOutputManifest {
  readonly schema: 'gspl.canonical-output-manifest';
  readonly schemaVersion: '1.0';
  readonly compilerVersion: string;
  readonly canonVersion: string;
  readonly fixtures: readonly FixtureRecord[];
  readonly manifestHash: string;
}

// Two-pass hash: body without `manifestHash` is canonical; the hash field is
// appended after we know it. Each reader can independently recompute the
// declared hash and compare. `environmentRecord` is intentionally OUTSIDE the
// hash-compared canonical manifest per the spec.
const bodyWithoutHash = {
  schema: 'gspl.canonical-output-manifest' as const,
  schemaVersion: '1.0',
  compilerVersion: compilerCoreContext.compilerVersion,
  canonVersion: compilerCoreContext.canonVersion,
  fixtures: Object.freeze(fixtureRecords.map((r) => Object.freeze({ ...r }))),
};
const manifestHash = sha256Hex(stableStringify(bodyWithoutHash));

const manifest: CanonicalOutputManifest = { ...bodyWithoutHash, manifestHash } as CanonicalOutputManifest;
const json = stableStringify(manifest) + '\n';

writeFileSync(OUT_FILE, json, 'utf8');
writeFileSync(OUT_HASH, manifestHash + '\n', 'utf8');

// eslint-disable-next-line no-console
console.log('[write-canonical-manifest] wrote', fixtureRecords.length, 'fixtures →', OUT_FILE);
console.log('[write-canonical-manifest] manifestHash:', manifestHash);
console.log('[write-canonical-manifest] non-canonical environment (kept separate):', JSON.stringify(environmentRecord));
