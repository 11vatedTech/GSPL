import { describe, it, expect } from 'vitest';
import {
  makePrimordialSeed,
  normalizeSeed,
  hashMaterialFromSeed,
  OUTPUT_EQUIVALENCE_LEVELS,
  compareEquivalence,
} from '../src/index.js';
import type { CanonicalSeed, ReproducibilityTuple } from '../src/index.js';

describe('Seed Format — primordial seed', () => {
  it('creates a valid primordial seed', () => {
    const seed = makePrimordialSeed({});
    expect(seed.schema).toBe('gspl.canonical-seed');
    expect(seed.schemaVersion).toBe('1.0');
    expect(seed.lineage.operation).toBe('primordial');
    expect(seed.lineage.generation).toBe(0);
    expect(seed.lineage.parents).toEqual([]);
    expect(seed.effectPermissions.filesystem).toBe('none');
    expect(seed.effectPermissions.processExecution).toBe(false);
    expect(seed.effectPermissions.networkAccess).toBe(false);
  });

  it('accepts overrides for namespace', () => {
    const seed = makePrimordialSeed({
      namespace: {
        domain: 'com.example',
        name: 'my-seed',
        title: 'My Seed',
      },
    });
    expect(seed.namespace!.domain).toBe('com.example');
    expect(seed.namespace!.name).toBe('my-seed');
  });

  it('accepts overrides for domain profile', () => {
    const seed = makePrimordialSeed({
      domainProfile: {
        domainId: 'character',
        requiredCapabilities: ['rendering'],
        optionalCapabilities: ['audio'],
      },
    });
    expect(seed.domainProfile.domainId).toBe('character');
  });

  it('accepts overrides for intent', () => {
    const seed = makePrimordialSeed({
      intent: {
        purpose: 'Test seed',
        architecturePatterns: ['layered'],
      },
    });
    expect(seed.intent.purpose).toBe('Test seed');
  });

  it('accepts genes in payload', () => {
    const seed = makePrimordialSeed({
      payload: {
        schemaVersion: '1.0',
        genes: {
          size: { type: 'scalar', value: 42, confidence: 0.9 },
          name: { type: 'categorical', value: 'test', locked: true },
        },
      },
    });
    expect(seed.payload.genes.size.value).toBe(42);
    expect(seed.payload.genes.name.locked).toBe(true);
  });

  it('defaults to no effects', () => {
    const seed = makePrimordialSeed({});
    const ep = seed.effectPermissions;
    expect(ep.filesystem).toBe('none');
    expect(ep.processExecution).toBe(false);
    expect(ep.networkAccess).toBe(false);
    expect(ep.modelInference).toBe(false);
  });
});

describe('Seed Format — normalization', () => {
  it('normalizeSeed produces JSON-safe output', () => {
    const seed = makePrimordialSeed({
      namespace: { domain: 'test', name: 'test' },
    });
    const norm = normalizeSeed(seed);
    expect(typeof norm).toBe('object');
    expect(norm.schema).toBe('gspl.canonical-seed');
  });
});

describe('Seed Format — hash material extraction', () => {
  it('extracts hash material (excludes identity and provenance)', () => {
    const seed = makePrimordialSeed({
      namespace: { domain: 'test', name: 'test' },
    });
    const material = hashMaterialFromSeed(seed);
    expect(material).toBeDefined();
    expect(typeof material).toBe('object');
  });
});

describe('Seed Format — equivalence levels', () => {
  it('has 8 equivalence levels', () => {
    expect(OUTPUT_EQUIVALENCE_LEVELS.length).toBe(8);
  });

  it('BYTE_IDENTICAL is the strongest', () => {
    expect(compareEquivalence('BYTE_IDENTICAL', 'BYTE_IDENTICAL')).toBe(true);
    expect(compareEquivalence('BYTE_IDENTICAL', 'STRUCTURALLY_IDENTICAL')).toBe(true);
    expect(compareEquivalence('STRUCTURALLY_IDENTICAL', 'BYTE_IDENTICAL')).toBe(false);
  });

  it('NOT_EQUIVALENT is the weakest', () => {
    expect(compareEquivalence('NOT_EQUIVALENT', 'BYTE_IDENTICAL')).toBe(false);
    expect(compareEquivalence('BYTE_IDENTICAL', 'NOT_EQUIVALENT')).toBe(true);
    expect(compareEquivalence('NOT_EQUIVALENT', 'NOT_EQUIVALENT')).toBe(true);
  });
});

describe('Seed Format — reproducibility tuple', () => {
  it('reproducibility tuple has all required fields', () => {
    const tuple: ReproducibilityTuple = {
      canonicalSeedHash: 'sha256:abcdef',
      canonicalCompilerVersion: '0.1.0',
      canonVersion: '1.0',
      knowledgePackageVersions: {},
      rulePackageVersions: {},
      targetContractVersion: '1.0',
      deterministicRuntimeProfile: 'node20',
      declaredEnvironment: { nodeVersion: '20.0.0' },
    };
    expect(tuple.canonicalSeedHash).toBeDefined();
    expect(tuple.canonVersion).toBe('1.0');
  });
});
