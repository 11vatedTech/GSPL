import type { Disposition, Confidence } from './disposition.js';
import type { ProvenanceSource } from './evidence.js';
export interface ArchitectureDecisionEntry {
    id: string;
    subsystem: string;
    disposition: Disposition;
    rationale: string;
    references: readonly string[];
    evidence: readonly ProvenanceSource[];
    confidence: Confidence;
}
export interface ArchitectureComparisonRegistry {
    schema: 'gspl.architecture-decisions';
    schemaVersion: '1.0';
    generatedAt: string;
    decisions: readonly ArchitectureDecisionEntry[];
}
//# sourceMappingURL=architecture.d.ts.map