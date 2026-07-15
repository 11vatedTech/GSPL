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
import type { ArchitectureComparisonRegistry, InventionRegistry, ProvenanceCheckReport, SourceRegistry } from './types.js';
export interface CheckInputs {
    inventions: InventionRegistry;
    decisions: ArchitectureComparisonRegistry;
    sources: SourceRegistry;
    knownRepoPaths?: ReadonlySet<string>;
}
export declare function checkProvenance(input: CheckInputs): ProvenanceCheckReport;
//# sourceMappingURL=validators.d.ts.map