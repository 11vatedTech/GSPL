import { describe, it, expect } from 'vitest';
import {
  ALL_CLAIM_STATUSES,
  type Claim,
  type ClaimRegistry,
} from '../src/types.js';
import { classify } from '../src/classifier.js';
import { isClaimId, isSupportedBy, REQUIRES_EVIDENCE, isLadderSkip, STATUS_RANK } from '../src/status.js';

function makeClaim(over: Partial<Claim> = {}): Claim {
  return {
    claimId: 'GSPL-CLAIM-0001',
    statement: 'GSPL seeds produce deterministic outputs identically when expanded twice with the same knowledge version.',
    status: 'PROVEN',
    scope: 'Within packages/canon-foundation tick cycle; not for live runtime experimentation.',
    conditions: ['Same $gst schema', 'Same knowledge version', 'No external mutator'],
    evidence: [{ repo: 'paradigm-reference', file: 'spec/07-determinism.md' }],
    counterEvidence: [],
    verificationMethod: 'Run npm test in packages/canon-foundation and compare artifact hashes.',
    falsificationCriteria: ['Two runs with same input produce different hashes'],
    relatedInventions: ['GSPL-INV-0001'],
    lastReviewed: '2026-07-14',
    ...over,
  };
}

describe('status helpers', () => {
  it('ALL_CLAIM_STATUSES contains the expected 8 statuses', () => {
    expect(ALL_CLAIM_STATUSES.length).toBe(8);
    for (const s of ALL_CLAIM_STATUSES) {
      expect(ALL_CLAIM_STATUSES).toContain(s);
    }
  });
  it('REQUIRES_EVIDENCE is exactly the statuses at or above PROTOTYPED', () => {
    expect(REQUIRES_EVIDENCE.has('PROVEN')).toBe(true);
    expect(REQUIRES_EVIDENCE.has('IMPLEMENTED')).toBe(true);
    expect(REQUIRES_EVIDENCE.has('PROTOTYPED')).toBe(true);
    expect(REQUIRES_EVIDENCE.has('THEORETICAL')).toBe(false);
    expect(REQUIRES_EVIDENCE.has('RESEARCH_REQUIRED')).toBe(false);
    expect(REQUIRES_EVIDENCE.has('UNSUPPORTED')).toBe(false);
    expect(REQUIRES_EVIDENCE.has('REFUTED')).toBe(false);
  });
  it('isClaimId validates GSPL-CLAIM-NNNN', () => {
    expect(isClaimId('GSPL-CLAIM-0001')).toBe(true);
    expect(isClaimId('GSPL-CLAIM-12345')).toBe(true);
    expect(isClaimId('GSPL-CLAIM-123')).toBe(false);
    expect(isClaimId('GSPL-INV-0001')).toBe(false);
  });
  it('isSupportedBy returns true when status does not require evidence or evidence is cited', () => {
    expect(isSupportedBy(makeClaim())).toBe(true);
    expect(isSupportedBy(makeClaim({ status: 'THEORETICAL' as any, evidence: [] }))).toBe(true);
    expect(isSupportedBy(makeClaim({ status: 'PROVEN' as any, evidence: [] }))).toBe(false);
  });
  it('STATUS_RANK orders PROVEN>IMPLEMENTED>PARTIALLY_IMPLEMENTED>PROTOTYPED>THEORETICAL>RESEARCH_REQUIRED>UNSUPPORTED>REFUTED', () => {
    expect(STATUS_RANK.PROVEN).toBeGreaterThan(STATUS_RANK.IMPLEMENTED);
    expect(STATUS_RANK.IMPLEMENTED).toBeGreaterThan(STATUS_RANK.PARTIALLY_IMPLEMENTED);
    expect(STATUS_RANK.PARTIALLY_IMPLEMENTED).toBeGreaterThan(STATUS_RANK.PROTOTYPED);
    expect(STATUS_RANK.PROTOTYPED).toBeGreaterThan(STATUS_RANK.THEORETICAL);
    expect(STATUS_RANK.THEORETICAL).toBeGreaterThan(STATUS_RANK.RESEARCH_REQUIRED);
    expect(STATUS_RANK.RESEARCH_REQUIRED).toBeGreaterThan(STATUS_RANK.UNSUPPORTED);
    expect(STATUS_RANK.UNSUPPORTED).toBeGreaterThan(STATUS_RANK.REFUTED);
  });
  it('isLadderSkip detects multi-step forward transitions as ladder skips', () => {
    expect(isLadderSkip('THEORETICAL', 'PARTIALLY_IMPLEMENTED')).toBe(true);
    expect(isLadderSkip('THEORETICAL', 'IMPLEMENTED')).toBe(true);
    expect(isLadderSkip('THEORETICAL', 'PROVEN')).toBe(true);
    expect(isLadderSkip('THEORETICAL', 'PROTOTYPED')).toBe(false);
    expect(isLadderSkip('PROTOTYPED', 'IMPLEMENTED')).toBe(true);
    expect(isLadderSkip('PROTOTYPED', 'PARTIALLY_IMPLEMENTED')).toBe(false);
  });
});

describe('classify', () => {
  it('passes a clean minimal registry', () => {
    const reg: ClaimRegistry = {
      schema: 'gspl.claims',
      schemaVersion: '1.0',
      generatedAt: '2026-07-14T00:00:00Z',
      claims: [makeClaim()],
    };
    const r = classify(reg);
    expect(r.ok).toBe(true);
    expect(r.summary.byStatus.PROVEN).toBe(1);
  });

  it('rejects bad id', () => {
    const reg: ClaimRegistry = {
      schema: 'gspl.claims',
      schemaVersion: '1.0',
      generatedAt: '2026-07-14T00:00:00Z',
      claims: [makeClaim({ claimId: 'NOT-A-CLAIM-ID' })],
    };
    const r = classify(reg);
    expect(r.errors.some((e) => e.code === 'BAD_CLAIM_ID')).toBe(true);
  });

  it('rejects PROVEN claim without evidence', () => {
    const reg: ClaimRegistry = {
      schema: 'gspl.claims',
      schemaVersion: '1.0',
      generatedAt: '2026-07-14T00:00:00Z',
      claims: [makeClaim({ status: 'PROVEN', evidence: [] })],
    };
    const r = classify(reg);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === 'MISSING_EVIDENCE')).toBe(true);
  });

  it('allows THEORETICAL claim without evidence', () => {
    const reg: ClaimRegistry = {
      schema: 'gspl.claims',
      schemaVersion: '1.0',
      generatedAt: '2026-07-14T00:00:00Z',
      claims: [makeClaim({ status: 'THEORETICAL', evidence: [], counterEvidence: [] })],
    };
    const r = classify(reg);
    expect(r.ok).toBe(true);
  });

  it('warns when REFUTED has no counter-evidence or evidence', () => {
    const reg: ClaimRegistry = {
      schema: 'gspl.claims',
      schemaVersion: '1.0',
      generatedAt: '2026-07-14T00:00:00Z',
      claims: [makeClaim({
        claimId: 'GSPL-CLAIM-0099',
        status: 'REFUTED',
        evidence: [],
        counterEvidence: [],
        verificationMethod: 'see Kolmogorov 1965',
        falsificationCriteria: ['Find an arbitrary data stream where output is shorter'],
      })],
    };
    const r = classify(reg);
    expect(r.warnings.some((w) => w.code === 'REFUTED_WITHOUT_COUNTER')).toBe(true);
  });

  it('rejects PROTOTYPED claim without falsification criteria', () => {
    const reg: ClaimRegistry = {
      schema: 'gspl.claims',
      schemaVersion: '1.0',
      generatedAt: '2026-07-14T00:00:00Z',
      claims: [makeClaim({ status: 'PROTOTYPED', falsificationCriteria: [] })],
    };
    const r = classify(reg);
    expect(r.errors.some((e) => e.code === 'MISSING_FALSIFICATION')).toBe(true);
  });

  it('detects illegal ladder-skip transition via expectedSteps', () => {
    const reg: ClaimRegistry = {
      schema: 'gspl.claims',
      schemaVersion: '1.0',
      generatedAt: '2026-07-14T00:00:00Z',
      claims: [makeClaim({ status: 'IMPLEMENTED' })],
    };
    const r = classify(reg, { expectedSteps: [{ from: 'THEORETICAL', to: 'IMPLEMENTED', since: '2026-07-14' }] });
    expect(r.summary.illegalTransitions.length).toBe(1);
  });

  it('counts claims per status', () => {
    const reg: ClaimRegistry = {
      schema: 'gspl.claims',
      schemaVersion: '1.0',
      generatedAt: '2026-07-14T00:00:00Z',
      claims: [
        makeClaim({ claimId: 'GSPL-CLAIM-0001', status: 'PROVEN' }),
        makeClaim({ claimId: 'GSPL-CLAIM-0002', status: 'IMPLEMENTED' }),
        makeClaim({ claimId: 'GSPL-CLAIM-0003', status: 'PROTOTYPED' }),
        makeClaim({ claimId: 'GSPL-CLAIM-0004', status: 'THEORETICAL', evidence: [], counterEvidence: [] }),
      ],
    };
    const r = classify(reg);
    expect(r.summary.byStatus.PROVEN).toBe(1);
    expect(r.summary.byStatus.IMPLEMENTED).toBe(1);
    expect(r.summary.byStatus.PROTOTYPED).toBe(1);
    expect(r.summary.byStatus.THEORETICAL).toBe(1);
  });

  it('detects duplicate ids', () => {
    const reg: ClaimRegistry = {
      schema: 'gspl.claims',
      schemaVersion: '1.0',
      generatedAt: '2026-07-14T00:00:00Z',
      claims: [makeClaim(), makeClaim({ canonicalName: undefined as any })],
    };
    const r = classify(reg);
    expect(r.errors.some((e) => e.code === 'DUPLICATE_CLAIM_ID')).toBe(true);
  });

  it('rejects top-level schema mismatch', () => {
    const reg: ClaimRegistry = {
      schema: 'wrong' as 'gspl.claims',
      schemaVersion: '1.0',
      generatedAt: '2026-07-14T00:00:00Z',
      claims: [makeClaim()],
    };
    const r = classify(reg);
    expect(r.errors.some((e) => e.code === 'BAD_SCHEMA')).toBe(true);
  });

  it('passes on an empty registry', () => {
    const reg: ClaimRegistry = {
      schema: 'gspl.claims',
      schemaVersion: '1.0',
      generatedAt: '2026-07-14T00:00:00Z',
      claims: [],
    };
    const r = classify(reg);
    expect(r.ok).toBe(true);
    expect(r.summary.claimsChecked).toBe(0);
  });
});
