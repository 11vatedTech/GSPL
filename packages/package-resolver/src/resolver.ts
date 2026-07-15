/** Content-Addressed Package Resolver — Prompt 2 §4, §16 */
import { createHash } from "node:crypto";

export type PackageKind = "CONTEXT" | "KNOWLEDGE" | "RULE" | "GENE_EXTENSION" | "TARGET_PROFILE";
export type ResolutionPolicy = "EXACT_ONLY" | "HIGHEST_COMPATIBLE" | "LOWEST_COMPATIBLE" | "LOCKFILE_REQUIRED";

export interface PackageCoordinate { readonly packageId: string; readonly version: string; readonly contentHash: string; readonly kind: PackageKind; }
export interface LockedPackage { readonly coordinate: PackageCoordinate; readonly dependencies: readonly PackageCoordinate[]; readonly capabilities: readonly string[]; readonly effects: readonly string[]; readonly license?: string; readonly provenance: PackageProvenanceRecord; }
export interface PackageLock { readonly schema: "gspl.package-lock"; readonly schemaVersion: string; readonly rootSeedId: string; readonly rootSeedHash: string; readonly resolutionPolicy: ResolutionPolicy; readonly packages: readonly LockedPackage[]; readonly dependencyEdges: readonly LockedDependencyEdge[]; readonly lockHash: string; }
export interface LockedDependencyEdge { readonly from: PackageCoordinate; readonly to: PackageCoordinate; }
export interface ResolvedPackage extends LockedPackage { loadedContent?: unknown; }
export interface PackageProvenanceRecord { readonly packageId: string; readonly version: string; readonly registeredBy: string; readonly registeredAt?: string; }
export interface PackageResolverConfig { readonly allowedKinds: readonly PackageKind[]; readonly maxDependencyDepth: number; readonly requireLicense: boolean; readonly requireProvenance: boolean; readonly resolutionPolicy: ResolutionPolicy; }
export interface ResolutionResult { readonly ok: boolean; readonly packages: readonly ResolvedPackage[]; readonly lockfile: PackageLock; readonly errors: readonly ResolutionError[]; }
export interface ResolutionError { readonly code: string; readonly packageId: string; readonly message: string; }

function pkgKey(coord: PackageCoordinate): string { return coord.packageId + "@" + coord.version; }

const DEFAULT_ALLOWED_KINDS: readonly PackageKind[] = ["CONTEXT", "KNOWLEDGE", "RULE", "GENE_EXTENSION", "TARGET_PROFILE"];
const DEFAULT_CONFIG: PackageResolverConfig = Object.freeze({
  allowedKinds: DEFAULT_ALLOWED_KINDS,
  maxDependencyDepth: 32,
  requireLicense: true,
  requireProvenance: true,
  resolutionPolicy: "LOCKFILE_REQUIRED" as ResolutionPolicy,
});

export function createPackageResolver(config?: Partial<PackageResolverConfig>) {
  var cfg = Object.freeze({ ...DEFAULT_CONFIG, ...config });
  var store = new Map<string, ResolvedPackage>();
  var rootSeedId = "";
  var rootSeedHash = "";

  function registerPackage(pkg: ResolvedPackage): void {
    var key = pkgKey(pkg.coordinate);
    if (store.has(key)) throw new Error("Duplicate: " + key);
    if (!cfg.allowedKinds.includes(pkg.coordinate.kind)) throw new Error("Disallowed: " + pkg.coordinate.kind);
    if (cfg.requireLicense && !pkg.license) throw new Error("Missing license: " + key);
    if (cfg.requireProvenance && !pkg.provenance) throw new Error("Missing provenance: " + key);
    store.set(key, Object.freeze(pkg));
  }

  function setRoot(seedId: string, seedHash: string): void { rootSeedId = seedId; rootSeedHash = seedHash; }

  function verifyHash(pkg: ResolvedPackage): boolean {
    if (!pkg.coordinate.contentHash) return true;
    try {
      var loaded = JSON.stringify(pkg.loadedContent ?? {});
      var actual = createHash("sha256").update(loaded).digest("hex");
      return "sha256:" + actual === pkg.coordinate.contentHash;
    } catch (e) { return false; }
  }

  function resolve(coord: PackageCoordinate, depth: number, visited?: Set<string>): ResolutionResult {
    var localEdges: LockedDependencyEdge[] = [];
    var errors: ResolutionError[] = [];
    var resolved: ResolvedPackage[] = [];
    var visitedSet = visited || new Set<string>();
    if (depth > cfg.maxDependencyDepth) { errors.push({ code: "MAX_DEPTH", packageId: coord.packageId, message: "Limit: " + depth }); return { ok: false, packages: resolved, lockfile: buildLockfile(resolved, localEdges), errors: errors }; }
    var key = pkgKey(coord);
    if (visitedSet.has(key)) { errors.push({ code: "CYCLE", packageId: coord.packageId, message: "Cycle: " + key }); return { ok: false, packages: resolved, lockfile: buildLockfile(resolved, localEdges), errors: errors }; }
    visitedSet.add(key);
    // Section 8: LOCKFILE_REQUIRED is a real policy gate. Reject when store is empty.
    if (cfg.resolutionPolicy === "LOCKFILE_REQUIRED" && store.size === 0) {
      errors.push({ code: "LOCK_REQUIRED", packageId: coord.packageId, message: "Lockfile required but empty store: " + key });
      return { ok: false, packages: resolved, lockfile: buildLockfile(resolved, localEdges), errors: errors };
    }
    var pkg = store.get(key);
    if (!pkg) { errors.push({ code: "NOT_FOUND", packageId: coord.packageId, message: "Not found: " + key }); return { ok: false, packages: resolved, lockfile: buildLockfile(resolved, localEdges), errors: errors }; }
    if (!verifyHash(pkg)) { errors.push({ code: "HASH_MISMATCH", packageId: coord.packageId, message: "Hash mismatch: " + key }); return { ok: false, packages: resolved, lockfile: buildLockfile(resolved, localEdges), errors: errors }; }
    resolved.push(pkg);
    for (var i = 0; i < pkg.dependencies.length; i++) {
      var dep = pkg.dependencies[i];
      localEdges.push({ from: pkg.coordinate, to: dep });
      var sub = resolve(dep, depth + 1, new Set(visitedSet));
      if (!sub.ok) { errors.push(...sub.errors); return { ok: false, packages: resolved, lockfile: buildLockfile(resolved, localEdges), errors: errors }; }
      for (var j = 0; j < sub.packages.length; j++) {
        var sk = pkgKey(sub.packages[j].coordinate);
        if (!resolved.some(function(r: ResolvedPackage) { return pkgKey(r.coordinate) === sk; })) resolved.push(sub.packages[j]);
      }
    }
    return { ok: true, packages: resolved, lockfile: buildLockfile(resolved, localEdges), errors: [] };
  }

  function buildLockfile(packages: readonly ResolvedPackage[], localEdges: LockedDependencyEdge[]): PackageLock {
    var lockEdges = [...localEdges];
    var lockPkgs = packages.map(function(p: ResolvedPackage): LockedPackage { return { coordinate: p.coordinate, dependencies: p.dependencies, capabilities: p.capabilities, effects: p.effects, license: p.license, provenance: p.provenance }; });
    var parts: string[] = [rootSeedId, rootSeedHash];
    var sortedPkgs = [...lockPkgs].sort(function(a: LockedPackage, b: LockedPackage) { return pkgKey(a.coordinate).localeCompare(pkgKey(b.coordinate)); });
    for (var i = 0; i < sortedPkgs.length; i++) {
      parts.push(pkgKey(sortedPkgs[i].coordinate) + ":" + sortedPkgs[i].coordinate.contentHash);
    }
    var lockHashSource = parts.join("\n");
    var lockHash = "sha256:" + createHash("sha256").update(lockHashSource).digest("hex");
    return Object.freeze({ schema: "gspl.package-lock" as const, schemaVersion: "1.0", rootSeedId: rootSeedId, rootSeedHash: rootSeedHash, resolutionPolicy: cfg.resolutionPolicy, packages: Object.freeze(sortedPkgs), dependencyEdges: Object.freeze(lockEdges), lockHash: lockHash });
  }

  function computeLockHash(): string { return buildLockfile([...store.values()], []).lockHash; }
  function getStoreSnapshot(): Map<string, ResolvedPackage> { return new Map(store); }
  function getLockfileSnapshot(): PackageLock { return buildLockfile([...store.values()], []); }

  return { registerPackage, setRoot, resolve, verifyHash, computeLockHash, getStore: getStoreSnapshot, getLockfile: getLockfileSnapshot };
}