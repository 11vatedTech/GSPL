/** Types aligned to the GSPL Canon user-spec schema (Prompt 1 §3-§5). */

export type Disposition =
  | "ADOPT"
  | "ADAPT"
  | "REWRITE"
  | "RESEARCH"
  | "ARCHIVE"
  | "REJECT";

export type Confidence = "HIGH" | "MEDIUM" | "LOW";

export type TargetSubsystem =
  | "kernel"
  | "gene-system"
  | "language"
  | "compiler"
  | "runtime"
  | "interoperability"
  | "translation-bridge"
  | "package-system"
  | "canon-governance";

export type ImplementationStatus = "spec-only" | "partial" | "complete";

export type ClaimStatus =
  | "PROVEN"
  | "IMPLEMENTED"
  | "PARTIALLY_IMPLEMENTED"
  | "PROTOTYPED"
  | "THEORETICAL"
  | "RESEARCH_REQUIRED"
  | "UNSUPPORTED"
  | "REFUTED";

export interface ProvenanceSource {
  repo: string;
  file: string;
  location?: string;
  commit?: string;
}

export interface InventionEntry {
  /** Stable canonical id, format: GSPL-INV-NNNN */
  id: string;
  canonicalName: string;
  aliases: readonly string[];
  founderIntent: string;
  definition: string;
  problemSolved: string;
  evidence: readonly ProvenanceSource[];
  implementationStatus: ImplementationStatus;
  claimStatus: ClaimStatus | null;
  dependencies: readonly string[];
  conflicts: readonly string[];
  risks: readonly string[];
  disposition: Disposition;
  targetSubsystem: TargetSubsystem;
  createdAtPolicy: string;
  schemaVersion: "1.0";
}

export interface ArchitectureDecisionEntry {
  id: string;
  subsystem: string;
  disposition: Disposition;
  rationale: string;
  references: readonly string[];
  evidence: readonly ProvenanceSource[];
  confidence: Confidence;
}

export interface InventionRegistry {
  schema: "gspl.invention-ledger";
  schemaVersion: "1.0";
  generatedAt: string;
  inventions: readonly InventionEntry[];
}

export interface ArchitectureComparisonRegistry {
  schema: "gspl.architecture-decisions";
  schemaVersion: "1.0";
  generatedAt: string;
  decisions: readonly ArchitectureDecisionEntry[];
}

export type SourceType = "spec" | "code" | "doc" | "test" | "archive";
export type SourceAvailability =
  | "available"
  | "archive-only"
  | "reproducibly-extractable";
export type SourceVerificationStatus = "verified" | "pending" | "failed";

export interface SourceRecord {
  sourceId: string;
  repositoryId: string;
  repositoryPath: string;
  relativePath: string;
  contentHash: string;
  sourceType: SourceType;
  language: string;
  symbolOrSection: string;
  availability: SourceAvailability;
  verificationStatus: SourceVerificationStatus;
  notes: string;
}

export interface SourceRegistry {
  schema: "gspl.sources";
  schemaVersion: "1.0";
  generatedAt: string;
  sources: readonly SourceRecord[];
}

export interface ProvenanceCheckReport {
  schema: "gspl.provenance-report";
  schemaVersion: "1.0";
  generatedAt: string;
  ok: boolean;
  errors: readonly ProvenanceError[];
  warnings: readonly ProvenanceError[];
  summary: {
    inventionsChecked: number;
    decisionsChecked: number;
    sourcesChecked: number;
    orphanedInventions: readonly string[];
    orphanedSources: readonly string[];
    unresolvedConflicts: readonly { inventionA: string; inventionB: string }[];
    absolutePathLeaks: readonly string[];
  };
}

export interface ProvenanceError {
  code: string;
  message: string;
  ids?: readonly string[];
}
