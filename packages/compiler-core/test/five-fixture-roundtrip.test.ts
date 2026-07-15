// 5-fixture round-trip test (Prompt 2 §3).
import { describe, it, expect } from 'vitest';
import { canonicalizeSeed, computeSeedHash, type CanonicalSeed } from '@gspl/seed-format';
import {
  createCompilerContext, runPipeline,
  reconstructSeedFromIr, verifyIndependentReconstruction,
} from '@gspl/compiler-core';
import {
  fixtureSoftwareArchitecture, fixtureInteractiveScene, fixtureMixedVideoGame,
  fixturePackageBacked, fixtureGeneExtension,
} from '../src/fixtures.js';

const FIXTURES: ReadonlyArray<readonly [string, CanonicalSeed]> = [
  ['software-architecture', fixtureSoftwareArchitecture],
  ['interactive-scene', fixtureInteractiveScene],
  ['mixed-video-game', fixtureMixedVideoGame],
  ['package-backed', fixturePackageBacked],
  ['gene-extension', fixtureGeneExtension],
];

describe('5-fixture round-trip (Prompt 2 §3)', () => {
  const ctx = createCompilerContext();
  for (const [id, seed] of FIXTURES) {
    it(`fixture ${id} round-trips byte-equal`, () => {
      const result = runPipeline(ctx, seed);
      expect(result.session.ir).toBeDefined();
      const originalBytes = canonicalizeSeed(seed);
      const verification = verifyIndependentReconstruction(originalBytes, result.session.ir!, {
        geneRegistry: ctx.geneRegistry,
        compilerVersion: ctx.compilerVersion,
        canonVersion: ctx.canonVersion,
        limits: { maxGenes: 1000, maxConstraints: 1000, maxDependencies: 1000 },
      });
      expect(verification.bytesMatch).toBe(true);
    });
  }
});
