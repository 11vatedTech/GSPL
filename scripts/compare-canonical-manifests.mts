/** compare-canonical-manifests.mts - cross-platform canonical-output manifest comparator (Prompt 2 §6). */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const argvPaths = process.argv.slice(2);
if (argvPaths.length !== 4) { console.error('usage: <m1> <m2> <m3> <m4>'); process.exit(2); }

function sha256(s: string): string { return 'sha256:' + createHash('sha256').update(s, 'utf8').digest('hex'); }
function sortKeysStringify(v: unknown): string { return JSON.stringify(v, (_k, value) => { if (value && typeof value === 'object' && !Array.isArray(value)) { const sorted: Record<string, unknown> = {}; for (const k of Object.keys(value as Record<string, unknown>).sort()) sorted[k] = (value as Record<string, unknown>)[k]; return sorted; } return value; }); }

interface Manifest { schema: string; schemaVersion: string; compilerVersion: string; canonVersion: string; fixtures: Array<Record<string, string>>; manifestHash: string; }
interface LoadRep { source: string; ok: boolean; errors: string[]; manifest: Manifest | null; declaredHash: string | null; recomputedHash: string | null; }

function loadOne(p: string): LoadRep {
  const abs = resolve(p);
  let raw: string;
  try { raw = readFileSync(abs, 'utf8'); } catch (e) { return { source: abs, ok: false, errors: ['read: ' + (e as Error).message], manifest: null, declaredHash: null, recomputedHash: null }; }
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch (e) { return { source: abs, ok: false, errors: ['parse: ' + (e as Error).message], manifest: null, declaredHash: null, recomputedHash: null }; }
  const m = parsed as Partial<Manifest>;
  if (m.schema !== 'gspl.canonical-output-manifest') return { source: abs, ok: false, errors: ['schema mismatch: ' + JSON.stringify(m.schema)], manifest: null, declaredHash: null, recomputedHash: null };
  if (m.schemaVersion !== '1.0') return { source: abs, ok: false, errors: ['schemaVersion mismatch: ' + JSON.stringify(m.schemaVersion)], manifest: null, declaredHash: null, recomputedHash: null };
  if (typeof m.compilerVersion !== 'string' || typeof m.canonVersion !== 'string' || !Array.isArray(m.fixtures) || typeof m.manifestHash !== 'string') {
    return { source: abs, ok: false, errors: ['shape invalid'], manifest: null, declaredHash: null, recomputedHash: null };
  }
  const body: Record<string, unknown> = { ...m };
  delete body.manifestHash;
  const recomputed = sha256(sortKeysStringify(body));
  const okSelf = m.manifestHash === recomputed;
  return { source: abs, ok: okSelf, errors: okSelf ? [] : ['declaredHash != recomputed (' + m.manifestHash + ' vs ' + recomputed + ')'], manifest: m as Manifest, declaredHash: m.manifestHash, recomputedHash: recomputed };
}

const reports = argvPaths.map(loadOne);
const FIELDS: ReadonlyArray<string> = ['canonicalSeedHash','canonicalSeedBytesHash','irHash','expansionPlanHash','artifactGraphHash','packageLockHash','canonicalDiagnosticsHash','canonicalProvenanceHash','reconstructedSeedHash','reconstructedBytesHash'];
const TOP: ReadonlyArray<string> = ['schema','schemaVersion','compilerVersion','canonVersion','manifestHash'];

interface Div { kind: string; fixtureId?: string; field?: string; values: Array<{ source: string; value: string }>; rationale: string; }
const divs: Div[] = [];

for (const f of TOP) {
  const v = reports.map((r) => r.manifest ? String((r.manifest as unknown as Record<string, unknown>)[f]) : '<unparseable>');
  if (new Set(v).size > 1) divs.push({ kind: 'top-level', field: f, values: reports.map((r, i) => ({ source: r.source, value: v[i] })), rationale: 'differs' });
}

const ids = Array.from(new Set(reports.flatMap((r) => r.manifest ? r.manifest.fixtures.map((f) => f.fixtureId) : []))).sort();
for (const fid of ids) {
  const per = reports.map((r) => r.manifest ? r.manifest.fixtures.find((f) => f.fixtureId === fid) ?? null : null);
  if (per.some((f) => f === null)) { divs.push({ kind: 'fixture', fixtureId: fid, values: reports.map((r, i) => ({ source: r.source, value: per[i] === null ? 'missing' : 'present' })), rationale: 'fixture missing' }); continue; }
  for (const field of FIELDS) {
    const v = per.map((f) => f ? String((f as unknown as Record<string, unknown>)[field]) : '<missing>');
    if (new Set(v).size > 1) divs.push({ kind: 'fixture-field-value', fixtureId: fid, field, values: reports.map((r, i) => ({ source: r.source, value: v[i] })), rationale: 'differs' });
  }
}

const ok = reports.every((r) => r.ok) && divs.length === 0;
const out = { schema: 'gspl.manifest-comparison-report', schemaVersion: '1.0', sources: argvPaths, selfHashFailures: reports.filter((r) => !r.ok).map((r) => ({ source: r.source, errors: r.errors })), declaredHashBySource: reports.map((r) => ({ source: r.source, declared: r.declaredHash, recomputed: r.recomputedHash })), divergences: divs, divergenceCount: divs.length, ok };
process.stdout.write(JSON.stringify(out, null, 2) + '\n');
if (!ok) process.exit(1);
