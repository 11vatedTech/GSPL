/** restart-reconstruction.mts - orchestration wrapper for §8 separate-process restart
 * For each of 5 fixtures, this script launches:
 *   1. node --experimental-strip-types scripts/restart-producer.mts <fixtureId> <outDir>
 *   2. node --experimental-strip-types scripts/restart-consumer.mts <outDir> <fixtureId>
 * Each invocation is a separate `node` process. The orchestrator exits 0 only
 * if every consumer exits 0; non-zero on any failure (with reason logged).
 */
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { resolve, join } from 'node:path';

const FIXTURES = ['software-architecture', 'interactive-scene', 'mixed-video-game', 'package-backed', 'gene-extension'];
const ROOT = resolve('.');
const RUN_ID = process.env.RUN_ID || randomUUID();
const OUT_DIR = join(ROOT, 'artifacts', 'validation', 'restart-' + RUN_ID);

interface StepResult { fixture: string; stage: 'producer' | 'consumer'; ok: boolean; code: number | null; stdout: string; stderr: string; }

function runNode(script: string, args: string[]): { ok: boolean; code: number | null; stdout: string; stderr: string } {
  const r = spawnSync(process.execPath, ['--experimental-strip-types', script, ...args], { encoding: 'utf8' });
  return { ok: r.status === 0, code: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}

const results: StepResult[] = [];
let allOk = true;
for (const fixtureId of FIXTURES) {
  const producerR = runNode(resolve('scripts/restart-producer.mts'), [fixtureId, OUT_DIR]);
  results.push({ fixture: fixtureId, stage: 'producer', ok: producerR.ok, code: producerR.code, stdout: producerR.stdout, stderr: producerR.stderr });
  if (!producerR.ok) { allOk = false; break; }
  const consumerR = runNode(resolve('scripts/restart-consumer.mts'), [OUT_DIR, fixtureId]);
  results.push({ fixture: fixtureId, stage: 'consumer', ok: consumerR.ok, code: consumerR.code, stdout: consumerR.stdout, stderr: consumerR.stderr });
  if (!consumerR.ok) { allOk = false; break; }
}

const report = {
  schema: 'gspl.restart-reconstruction-report',
  schemaVersion: '1.0',
  runId: RUN_ID,
  outDir: OUT_DIR,
  fixtures: FIXTURES,
  results,
  ok: allOk,
};
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
if (!allOk) process.exit(1);
