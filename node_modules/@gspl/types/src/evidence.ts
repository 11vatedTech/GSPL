export interface ProvenanceSource {
  repo: string;
  file: string;
  location?: string;
  commit?: string;
}

export interface EvidenceReference {
  /** archive:// URI or repository-rooted path */
  uri: string;
  /** Repository identifier */
  repositoryId: string;
  /** Relative path within the repository */
  relativePath: string;
  /** Optional symbol reference */
  symbol?: string;
  /** Content hash (SHA-256) */
  contentHash?: string;
  /** File size in bytes */
  byteSize?: number;
}
