export type SourceType = 'spec' | 'code' | 'doc' | 'test' | 'archive' | 'config';
export type SourceAvailability = 'available' | 'archive-only' | 'reproducibly-extractable';
export type SourceVerificationStatus = 'verified' | 'pending' | 'failed';
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
    schema: 'gspl.sources';
    schemaVersion: '1.0';
    generatedAt: string;
    sources: readonly SourceRecord[];
}
//# sourceMappingURL=source.d.ts.map