export interface ProvenanceError {
  code: string;
  message: string;
  ids?: readonly string[];
}

export interface ProvenanceCheckReport {
  schema: 'gspl.provenance-report';
  schemaVersion: '1.0';
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
