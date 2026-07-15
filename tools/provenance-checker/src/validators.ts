/**
 * Validators aligned to the user-spec schema (Prompt 1 sections 3-5).
 *
 * Validates:
 *  - invention id format and uniqueness
 *  - required fields (canonicalName, definition, founderIntent, schemaVersion)
 *  - evidence references are well-formed ProvenanceSource objects
 *  - no absolute local path strings used as canonical evidence
 *  - dependency and conflict targets exist
 *  - architecture decision ids and evidence are well-formed
 *  - decision references resolve to existing inventions
 *  - orphan inventions (no decision reference) and orphan sources (not cited)
 *  - unresolved conflicts (both sides still live)
 *  - schema-version mismatches
 */

import type {
  ArchitectureComparisonRegistry,
  InventionEntry,
  InventionRegistry,
  ProvenanceCheckReport,
  ProvenanceError,
  ProvenanceSource,
  SourceRegistry,
} from './types.js';
import {
  isArchitectureId,
  isInventionId,
  isValidClaimStatus,
  isValidDisposition,
  isValidTarget,
} from './ids.js';

export interface CheckInputs {
  inventions: InventionRegistry;
  decisions: ArchitectureComparisonRegistry;
  sources: SourceRegistry;
  knownRepoPaths?: ReadonlySet<string>;
}

const ABSOLUTE_PATH_PREFIX = /^(?:[A-Za-z]:[\\/]|\/)/;
const ARCHIVE_URI_RE = /^archive:\/\/.+!\/.+/;

const VALID_IMPLEMENTATION_STATUS = new Set<string>(['spec-only', 'partial', 'complete']);

export function checkProvenance(input: CheckInputs): ProvenanceCheckReport {
  const errors: ProvenanceError[] = [];
  const warnings: ProvenanceError[] = [];

  if (input.inventions.schema !== 'gspl.invention-ledger') {
    errors.push({ code: 'BAD_SCHEMA', message: 'inventions schema must be gspl.invention-ledger' });
  }
  if (input.decisions.schema !== 'gspl.architecture-decisions') {
    errors.push({ code: 'BAD_SCHEMA', message: 'decisions schema must be gspl.architecture-decisions' });
  }
  if (input.sources.schema !== 'gspl.sources') {
    errors.push({ code: 'BAD_SCHEMA', message: 'sources schema must be gspl.sources' });
  }

  // --- inventions ---
  const seenInventionIds = new Set<string>();
  const sourceFileKeys = new Set<string>();
  const absoluteLeaks: string[] = [];

  for (const s of input.sources.sources) {
    sourceFileKeys.add(s.repositoryId + ':' + s.relativePath);
  }

  for (const inv of input.inventions.inventions) {
    if (!isInventionId(inv.id)) {
      errors.push({ code: 'BAD_INVENTION_ID', message: 'invention id must be GSPL-INV-NNNN', ids: [inv.id] });
    }
    if (seenInventionIds.has(inv.id)) {
      errors.push({ code: 'DUPLICATE_INVENTION_ID', message: 'invention id duplicated: ' + inv.id, ids: [inv.id] });
    }
    seenInventionIds.add(inv.id);

    if (!inv.canonicalName || inv.canonicalName.length < 2) {
      errors.push({ code: 'EMPTY_CANONICAL_NAME', message: 'invention canonicalName empty', ids: [inv.id] });
    }
    if (!inv.definition || inv.definition.length < 5) {
      errors.push({ code: 'EMPTY_DEFINITION', message: 'invention definition empty', ids: [inv.id] });
    }
    if (!inv.founderIntent || inv.founderIntent.length < 5) {
      warnings.push({ code: 'EMPTY_FOUNDER_INTENT', message: 'invention founderIntent empty', ids: [inv.id] });
    }
    if (!VALID_IMPLEMENTATION_STATUS.has(inv.implementationStatus)) {
      errors.push({ code: 'BAD_IMPLEMENTATION_STATUS', message: 'invention implementationStatus invalid: ' + inv.implementationStatus, ids: [inv.id] });
    }
    if (!isValidDisposition(inv.disposition)) {
      errors.push({ code: 'BAD_DISPOSITION', message: 'invention disposition invalid: ' + inv.disposition, ids: [inv.id] });
    }
    if (!isValidTarget(inv.targetSubsystem)) {
      errors.push({ code: 'BAD_TARGET', message: 'invention targetSubsystem invalid: ' + inv.targetSubsystem, ids: [inv.id] });
    }
    if (inv.claimStatus !== null && !isValidClaimStatus(inv.claimStatus)) {
      errors.push({ code: 'BAD_CLAIM_STATUS', message: 'invention claimStatus invalid: ' + inv.claimStatus, ids: [inv.id] });
    }
    if (inv.schemaVersion !== '1.0') {
      errors.push({ code: 'BAD_SCHEMA_VERSION', message: 'invention schemaVersion must be 1.0', ids: [inv.id] });
    }

    if (!inv.evidence || inv.evidence.length === 0) {
      errors.push({ code: 'NO_EVIDENCE', message: 'invention has no evidence', ids: [inv.id] });
    } else {
      for (const e of inv.evidence) {
        if (!e.repo || !e.file) {
          errors.push({ code: 'EMPTY_EVIDENCE', message: 'invention cites empty evidence', ids: [inv.id] });
          continue;
        }
        if (ABSOLUTE_PATH_PREFIX.test(e.file)) {
          absoluteLeaks.push(e.repo + ':' + e.file);
          errors.push({ code: 'ABSOLUTE_PATH', message: 'invention cites absolute path: ' + e.file, ids: [inv.id] });
        }
        if (ARCHIVE_URI_RE.test(e.file)) {
          warnings.push({ code: 'ARCHIVE_URI_OK', message: 'invention cites archive URI: ' + e.file, ids: [inv.id] });
        }
        const k = e.repo + ':' + e.file;
        if (sourceFileKeys.size > 0 && !sourceFileKeys.has(k) && input.knownRepoPaths && !input.knownRepoPaths.has(k)) {
          warnings.push({ code: 'UNKNOWN_SOURCE', message: 'evidence not in sources registry: ' + k, ids: [inv.id] });
        }
      }
    }
  }

  // Resolve dependencies and conflicts against the full set once all ids are known.
  const fullIds = new Set<string>(input.inventions.inventions.map((i) => i.id));
  for (const inv of input.inventions.inventions) {
    for (const d of inv.dependencies) {
      if (!fullIds.has(d)) errors.push({ code: 'MISSING_DEPENDENCY', message: 'invention ' + inv.id + ' depends on unknown ' + d, ids: [inv.id] });
    }
    for (const c of inv.conflicts) {
      if (!fullIds.has(c)) errors.push({ code: 'MISSING_CONFLICT', message: 'invention ' + inv.id + ' conflicts with unknown ' + c, ids: [inv.id] });
    }
  }

  // --- architecture decisions ---
  const seenDecisionIds = new Set<string>();
  for (const d of input.decisions.decisions) {
    if (!isArchitectureId(d.id)) errors.push({ code: 'BAD_DECISION_ID', message: 'decision id must be GSPL-ARCH-NNNN: ' + d.id, ids: [d.id] });
    if (seenDecisionIds.has(d.id)) errors.push({ code: 'DUPLICATE_DECISION_ID', message: 'decision id duplicated: ' + d.id, ids: [d.id] });
    seenDecisionIds.add(d.id);
    if (!isValidDisposition(d.disposition)) errors.push({ code: 'BAD_DECISION_DISPOSITION', message: 'decision disposition invalid: ' + d.disposition, ids: [d.id] });
    if (!d.rationale || d.rationale.length < 5) errors.push({ code: 'EMPTY_RATIONALE', message: 'decision rationale empty', ids: [d.id] });
    if (!d.evidence || d.evidence.length === 0) {
      errors.push({ code: 'NO_DECISION_EVIDENCE', message: 'decision has no evidence', ids: [d.id] });
    } else {
      for (const e of d.evidence) {
        if (!e.repo || !e.file) {
          errors.push({ code: 'EMPTY_DECISION_EVIDENCE', message: 'decision cites empty evidence', ids: [d.id] });
        }
        if (e.file && ABSOLUTE_PATH_PREFIX.test(e.file)) {
          errors.push({ code: 'ABSOLUTE_PATH', message: 'decision cites absolute path: ' + e.file, ids: [d.id] });
        }
      }
    }
    for (const r of d.references) {
      if (!fullIds.has(r)) errors.push({ code: 'BAD_DECISION_REFERENCE', message: 'decision ' + d.id + ' references unknown invention ' + r, ids: [d.id] });
    }
  }

  // --- orphan detection ---
  const referencedByDecision = new Set<string>();
  for (const d of input.decisions.decisions) for (const r of d.references) referencedByDecision.add(r);
  const citedByInvention = new Set<string>();
  for (const inv of input.inventions.inventions) {
    for (const s of inv.evidence) citedByInvention.add(s.repo + ':' + s.file);
  }
  const orphaned: string[] = [];
  for (const id of fullIds) {
    if (!referencedByDecision.has(id)) orphaned.push(id);
  }
  const orphanSources: string[] = [];
  for (const s of input.sources.sources) {
    const k = s.repositoryId + ':' + s.relativePath;
    if (!citedByInvention.has(k)) orphanSources.push(s.sourceId);
  }

  // --- unresolved conflicts ---
  const dispById = new Map<string, string>();
  for (const inv of input.inventions.inventions) dispById.set(inv.id, inv.disposition);
  const unresolved: { inventionA: string; inventionB: string }[] = [];
  const liveSet = new Set<string>(['ADOPT', 'ADAPT', 'REWRITE']);
  for (const inv of input.inventions.inventions) {
    for (const cTarget of inv.conflicts) {
      if (!fullIds.has(cTarget)) continue;
      const aD = dispById.get(inv.id) ?? '';
      const bD = dispById.get(cTarget) ?? '';
      if (liveSet.has(aD) && liveSet.has(bD)) {
        const first = inv.id < cTarget ? inv.id : cTarget;
        const second = inv.id < cTarget ? cTarget : inv.id;
        if (!unresolved.some((u) => u.inventionA === first && u.inventionB === second)) {
          unresolved.push({ inventionA: first, inventionB: second });
        }
      }
    }
  }

  errors.sort((a, b) => ((a.code + (a.ids?.[0] ?? '')) < (b.code + (b.ids?.[0] ?? '')) ? -1 : 1));
  warnings.sort((a, b) => ((a.code + (a.ids?.[0] ?? '')) < (b.code + (b.ids?.[0] ?? '')) ? -1 : 1));
  orphaned.sort();
  orphanSources.sort();
  unresolved.sort((a, b) => (a.inventionA < b.inventionA ? -1 : 1));

  return {
    schema: 'gspl.provenance-report',
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    ok: errors.length === 0,
    errors,
    warnings,
    summary: {
      inventionsChecked: input.inventions.inventions.length,
      decisionsChecked: input.decisions.decisions.length,
      sourcesChecked: input.sources.sources.length,
      orphanedInventions: orphaned,
      orphanedSources: orphanSources,
      unresolvedConflicts: unresolved,
      absolutePathLeaks: absoluteLeaks,
    },
  };
}
