export type PackageKind = "CONTEXT" | "KNOWLEDGE" | "RULE" | "GENE_EXTENSION" | "TARGET_PROFILE";
export type ResolutionPolicy = "EXACT_ONLY" | "HIGHEST_COMPATIBLE" | "LOWEST_COMPATIBLE" | "LOCKFILE_REQUIRED";
export interface PackageCoordinate {
    readonly packageId: string;
    readonly version: string;
    readonly contentHash: string;
    readonly kind: PackageKind;
}
export interface LockedPackage {
    readonly coordinate: PackageCoordinate;
    readonly dependencies: readonly PackageCoordinate[];
    readonly capabilities: readonly string[];
    readonly effects: readonly string[];
    readonly license?: string;
    readonly provenance: PackageProvenanceRecord;
}
export interface PackageLock {
    readonly schema: "gspl.package-lock";
    readonly schemaVersion: string;
    readonly rootSeedId: string;
    readonly rootSeedHash: string;
    readonly resolutionPolicy: ResolutionPolicy;
    readonly packages: readonly LockedPackage[];
    readonly dependencyEdges: readonly LockedDependencyEdge[];
    readonly lockHash: string;
}
export interface LockedDependencyEdge {
    readonly from: PackageCoordinate;
    readonly to: PackageCoordinate;
}
export interface ResolvedPackage extends LockedPackage {
    loadedContent?: unknown;
}
export interface PackageProvenanceRecord {
    readonly packageId: string;
    readonly version: string;
    readonly registeredBy: string;
    readonly registeredAt?: string;
}
export interface PackageResolverConfig {
    readonly allowedKinds: readonly PackageKind[];
    readonly maxDependencyDepth: number;
    readonly requireLicense: boolean;
    readonly requireProvenance: boolean;
    readonly resolutionPolicy: ResolutionPolicy;
}
export interface ResolutionResult {
    readonly ok: boolean;
    readonly packages: readonly ResolvedPackage[];
    readonly lockfile: PackageLock;
    readonly errors: readonly ResolutionError[];
}
export interface ResolutionError {
    readonly code: string;
    readonly packageId: string;
    readonly message: string;
}
export declare function createPackageResolver(config?: Partial<PackageResolverConfig>): {
    registerPackage: (pkg: ResolvedPackage) => void;
    setRoot: (seedId: string, seedHash: string) => void;
    resolve: (coord: PackageCoordinate, depth: number, visited?: Set<string>) => ResolutionResult;
    verifyHash: (pkg: ResolvedPackage) => boolean;
    computeLockHash: () => string;
    getStore: () => Map<string, ResolvedPackage>;
    getLockfile: () => PackageLock;
};
//# sourceMappingURL=resolver.d.ts.map