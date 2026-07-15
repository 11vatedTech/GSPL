/** Seed operations — Prompt 2 §5-6 */

import { createHash } from 'node:crypto';
import { canonicalize, canonicalizeAny } from '@gspl/canon-foundation';
import type { CanonicalSeed } from './seed.js';

// ── Field-level hash policy (§6) ──

export type HashPolicy = 'HASHED' | 'NON_HASHED' | 'DERIVED' | 'AUTHORING_ONLY' | 'RUNTIME_ONLY';

export const HASH_POLICY: Record<string, HashPolicy> = {
  'schema': 'HASHED',
  'schemaVersion': 'HASHED',
  'identity.contentId': 'DERIVED',
  'identity.authoredId': 'HASHED',
  'identity.revisionId': 'NON_HASHED',
  'identity.lineageId': 'HASHED',
  'identity.packageId': 'HASHED',
  'namespace': 'HASHED',
  'domainProfile': 'HASHED',
  'intent': 'HASHED',
  'payload': 'HASHED',
  'constraints': 'HASHED',
  'dependencies': 'HASHED',
  'entropy': 'HASHED',
  'lineage': 'HASHED',
  'provenance.author': 'HASHED',
  'provenance.tool': 'HASHED',
  'provenance.toolVersion': 'HASHED',
  'provenance.compilerVersion': 'HASHED',
  'provenance.canonVersion': 'HASHED',
  'provenance.created': 'NON_HASHED',
  'provenance.modified': 'NON_HASHED',
  'resourceBudget': 'HASHED',
  'effectPermissions': 'HASHED',
  'validationRequirements': 'NON_HASHED',
  'compatibilityRequirements': 'NON_HASHED',
};

export function isHashedField(fieldPath: string): boolean {
  return HASH_POLICY[fieldPath] === 'HASHED';
}

/**
 * Extract only HASHED fields for canonical hash computation.
 * Excludes: DERIVED (contentId), NON_HASHED (timestamps, validation reqs), AUTHORING_ONLY, RUNTIME_ONLY.
 */
export function extractCanonicalHashMaterial(seed: CanonicalSeed): Record<string, unknown> {
  return {
    schema: seed.schema,
    schemaVersion: seed.schemaVersion,
    identity: {
      authoredId: seed.identity.authoredId,
      lineageId: seed.identity.lineageId,
      packageId: seed.identity.packageId,
    },
    namespace: seed.namespace,
    domainProfile: seed.domainProfile,
    intent: seed.intent,
    payload: seed.payload,
    constraints: seed.constraints,
    dependencies: seed.dependencies,
    entropy: seed.entropy,
    lineage: seed.lineage,
    provenance: {
      author: seed.provenance.author,
      tool: seed.provenance.tool,
      toolVersion: seed.provenance.toolVersion,
      compilerVersion: seed.provenance.compilerVersion,
      canonVersion: seed.provenance.canonVersion,
    },
    resourceBudget: seed.resourceBudget,
    effectPermissions: seed.effectPermissions,
  };
}

// ── Seed Creation ──

export function makePrimordialSeed(overrides: Partial<CanonicalSeed>): CanonicalSeed {
  const defaults: CanonicalSeed = {
    schema: 'gspl.canonical-seed', schemaVersion: '1.0',
    identity: { contentId: '', authoredId: undefined },
    domainProfile: { domainId: 'seed', requiredCapabilities: [], optionalCapabilities: [] },
    intent: { purpose: 'Primordial seed created by GSPL compiler' },
    payload: { schemaVersion: '1.0', genes: {} },
    constraints: { valueRanges: [], structuralConditions: [], targetRestrictions: [], performanceBudgets: [], compatibilityConditions: [] },
    dependencies: { contextRefs: [], knowledgeRefs: [], ruleSetRefs: [], targetContracts: [] },
    entropy: { algorithm: 'gspl-splitmix64', algorithmVersion: '1.0', rootSeed: '', channels: [] },
    lineage: { operation: 'primordial', parents: [], generation: 0 },
    provenance: { canonVersion: '1.0' },
    resourceBudget: {},
    effectPermissions: { filesystem: 'none', processExecution: false, networkAccess: false, environmentAccess: false, timeAccess: false, foreignCodeExecution: false, nativeExtensions: false, modelInference: false },
  };
  return { ...defaults, ...overrides } as CanonicalSeed;
}

// ── Canonical Normalization (§5) ──

/**
 * Recursive canonical normalizer — replaces JSON.parse(JSON.stringify).
 * Uses GSPL JCS (JSON Canonicalization Scheme) from canon-foundation.
 * - Sorts object keys lexicographically
 * - Strips undefined values
 * - Normalizes Unicode (NFKC)
 * - Normalizes number representations
 */
export function normalizeSeed(seed: CanonicalSeed): CanonicalSeed {
  // Canonicalize to bytes, then parse back for deep normalization
  const bytes = canonicalizeSeed(seed);
  const text = new TextDecoder().decode(bytes);
  return JSON.parse(text) as CanonicalSeed;
}

/** Compute canonical bytes of a seed using JCS */
export function canonicalizeSeed(seed: CanonicalSeed): Uint8Array {
  // Strip non-canonical fields before canonicalization
  const clean: Record<string, unknown> = {};
  const raw = seed as unknown as Record<string, unknown>;
  for (const key of Object.keys(raw).sort()) {
    if (key === 'identity') {
      const id = seed.identity;
      clean.identity = { authoredId: id.authoredId, revisionId: id.revisionId, lineageId: id.lineageId, packageId: id.packageId };
    } else {
      clean[key] = raw[key];
    }
  }
  return canonicalizeAny(clean);
}

// ── Content Hashing (§6) ──

/** Extract fields for content hashing (backward-compatible) */
export function hashMaterialFromSeed(seed: CanonicalSeed): Record<string, unknown> {
  return extractCanonicalHashMaterial(seed);
}

/** Compute SHA-256 content hash of a seed */
export function computeSeedHash(seed: CanonicalSeed): string {
  const material = extractCanonicalHashMaterial(seed);
  const bytes = canonicalizeAny(material);
  return 'sha256:' + createHash('sha256').update(bytes).digest('hex');
}

/** Verify a seed's content hash matches its identity.contentId */
export function verifySeedHash(seed: CanonicalSeed): { ok: boolean; expected: string; actual: string } {
  const actual = computeSeedHash(seed);
  const expected = seed.identity.contentId;
  const ok = actual === expected;
  return { ok, expected, actual };
}
