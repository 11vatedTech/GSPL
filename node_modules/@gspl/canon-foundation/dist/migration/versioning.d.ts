/** Schema Versioning and Migration — Prompt 2 §14 */
export type MigrationKind = 'representation' | 'semantic' | 'compiler' | 'target' | 'knowledge';
export interface SchemaVersion {
    schema: string;
    version: string;
    releasedAt: string;
    deprecatedAt?: string;
    retiredAt?: string;
}
export interface Migration {
    id: string;
    kind: MigrationKind;
    fromSchema: string;
    fromVersion: string;
    toSchema: string;
    toVersion: string;
    reversible: boolean;
    description: string;
    breaking: boolean;
    migrate: (data: unknown) => unknown;
    reverse?: (data: unknown) => unknown;
}
export interface MigrationResult {
    ok: boolean;
    migrated?: unknown;
    diagnostics: MigrationDiagnostic[];
    provenance: MigrationProvenance;
}
export interface MigrationDiagnostic {
    code: string;
    severity: 'error' | 'warning' | 'info';
    message: string;
    semanticChange?: string;
}
export interface MigrationProvenance {
    migrationId: string;
    fromVersion: string;
    toVersion: string;
    compilerVersion: string; /** Operational audit — NOT canonical */
    appliedAt?: string;
}
export interface CompatibilityCheck {
    fromSchema: string;
    fromVersion: string;
    toSchema: string;
    toVersion: string;
    compatible: boolean;
    reason?: string;
    requiredMigrations: string[];
}
export interface VersionRegistry {
    schemas: Map<string, SchemaVersion[]>;
    migrations: Migration[];
}
export declare function createVersionRegistry(): VersionRegistry;
export declare function registerSchemaVersion(registry: VersionRegistry, schema: SchemaVersion): void;
export declare function registerMigration(registry: VersionRegistry, migration: Migration): void;
export declare function checkCompatibility(registry: VersionRegistry, fromSchema: string, fromVersion: string, toSchema: string, toVersion: string): CompatibilityCheck;
export declare function applyMigration(migration: Migration, data: unknown): MigrationResult;
export declare function migrateToVersion(registry: VersionRegistry, data: unknown, fromSchema: string, fromVersion: string, toSchema: string, toVersion: string): MigrationResult;
//# sourceMappingURL=versioning.d.ts.map