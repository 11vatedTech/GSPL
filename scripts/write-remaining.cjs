var fs = require('fs');

// 1. Fix package-resolver with cycle detection
var resolver = `/** Content-Addressed Package Resolver — Prompt 2 §16 */
import { createHash } from "node:crypto";

export type PackageKind = "CONTEXT" | "KNOWLEDGE" | "RULE" | "GENE_EXTENSION" | "TARGET_PROFILE";

export interface PackageCoordinate { packageId: string; version: string; contentHash: string; kind: PackageKind; }
export interface PackageLock { schema: "gspl.package-lock"; schemaVersion: string; rootSeedId: string; packages: Record<string, ResolvedPackage>; lockHash: string; }
export interface ResolvedPackage { coordinate: PackageCoordinate; dependencies: PackageCoordinate[]; capabilities: string[]; effects: string[]; license?: string; provenance: PackageProvenanceRecord; loadedContent?: unknown; }
export interface PackageProvenanceRecord { packageId: string; version: string; registeredBy: string; registeredAt?: string; }
export interface PackageResolverConfig { allowedKinds: PackageKind[]; maxDependencyDepth: number; requireLicense: boolean; requireProvenance: boolean; }
export interface ResolutionResult { ok: boolean; packages: ResolvedPackage[]; lockfile: PackageLock; errors: ResolutionError[]; }
export interface ResolutionError { code: string; packageId: string; message: string; }

var DEFAULT_CONFIG: PackageResolverConfig = { allowedKinds: ["CONTEXT","KNOWLEDGE","RULE","GENE_EXTENSION","TARGET_PROFILE"], maxDependencyDepth: 32, requireLicense: true, requireProvenance: true };

function pkgKey(coord: PackageCoordinate): string { return coord.packageId + "@" + coord.version; }

export function createPackageResolver(config?: Partial<PackageResolverConfig>) {
  var cfg = { ...DEFAULT_CONFIG, ...config };
  var store = new Map<string, ResolvedPackage>();
  var lockfile: PackageLock = { schema: "gspl.package-lock", schemaVersion: "1.0", rootSeedId: "", packages: {}, lockHash: "" };

  function registerPackage(pkg: ResolvedPackage): void {
    var key = pkgKey(pkg.coordinate);
    if (store.has(key)) throw new Error("Duplicate: " + key);
    if (!cfg.allowedKinds.includes(pkg.coordinate.kind)) throw new Error("Disallowed kind: " + pkg.coordinate.kind);
    if (cfg.requireLicense && !pkg.license) throw new Error("Missing license: " + key);
    if (cfg.requireProvenance && !pkg.provenance) throw new Error("Missing provenance: " + key);
    store.set(key, pkg);
  }

  function verifyHash(pkg: ResolvedPackage): boolean {
    if (!pkg.coordinate.contentHash) return true;
    try {
      var loaded = JSON.stringify(pkg.loadedContent ?? {});
      var actual = createHash("sha256").update(loaded).digest("hex");
      return "sha256:" + actual === pkg.coordinate.contentHash;
    } catch (e) { return false; }
  }

  function resolve(coord: PackageCoordinate, depth: number, visited?: Set<string>): ResolutionResult {
    var errors: ResolutionError[] = [];
    var resolved: ResolvedPackage[] = [];
    var visitedSet = visited || new Set<string>();
    if (depth > cfg.maxDependencyDepth) { errors.push({ code: "MAX_DEPTH", packageId: coord.packageId, message: "Depth: " + depth }); return { ok: false, packages: resolved, lockfile, errors }; }
    var key = pkgKey(coord);
    if (visitedSet.has(key)) { errors.push({ code: "CYCLE", packageId: coord.packageId, message: "Dependency cycle: " + key }); return { ok: false, packages: resolved, lockfile, errors }; }
    visitedSet.add(key);
    var pkg = store.get(key);
    if (!pkg) { errors.push({ code: "NOT_FOUND", packageId: coord.packageId, message: "Not found: " + key }); return { ok: false, packages: resolved, lockfile, errors }; }
    if (!verifyHash(pkg)) { errors.push({ code: "HASH_MISMATCH", packageId: coord.packageId, message: "Hash mismatch: " + key }); return { ok: false, packages: resolved, lockfile, errors }; }
    if (lockfile.packages[key]) return { ok: true, packages: [pkg], lockfile, errors: [] };
    lockfile.packages[key] = pkg;
    resolved.push(pkg);
    for (var i = 0; i < pkg.dependencies.length; i++) {
      var dep = pkg.dependencies[i];
      var sub = resolve(dep, depth + 1, new Set(visitedSet));
      if (!sub.ok) { errors.push(...sub.errors); return { ok: false, packages: resolved, lockfile, errors }; }
      for (var j = 0; j < sub.packages.length; j++) {
        var sk = pkgKey(sub.packages[j].coordinate);
        if (!resolved.some(function(r) { return pkgKey(r.coordinate) === sk; })) resolved.push(sub.packages[j]);
      }
    }
    return { ok: errors.length === 0, packages: resolved, lockfile, errors };
  }

  function computeLockHash(): string {
    var keys = Object.keys(lockfile.packages).sort();
    var parts: string[] = [];
    for (var i = 0; i < keys.length; i++) {
      var p = lockfile.packages[keys[i]];
      parts.push(keys[i] + ":" + p.coordinate.contentHash);
    }
    return "sha256:" + createHash("sha256").update(parts.join("\n")).digest("hex");
  }

  function getStoreSnapshot(): Map<string, ResolvedPackage> { return new Map(store); }
  function getLockfileSnapshot(): PackageLock { return JSON.parse(JSON.stringify(lockfile)); }

  return { registerPackage, resolve, verifyHash, computeLockHash, getStore: getStoreSnapshot, getLockfile: getLockfileSnapshot };
}
`;
fs.writeFileSync('packages/package-resolver/src/resolver.ts', resolver);

// 2. Fix verifySeedHash bug
var oldSeedOps = fs.readFileSync('packages/seed-format/src/seed-ops.ts', 'utf-8');
var fixedVerifyHash = oldSeedOps.replace(
  "const ok = expected === '' || actual === expected; // Allow empty contentId for newly created seeds",
  "const ok = actual === expected;"
).replace(
  "return { ok, expected: expected || actual, actual };",
  "return { ok, expected, actual };"
);
fs.writeFileSync('packages/seed-format/src/seed-ops.ts', fixedVerifyHash);

console.log('Fixed resolver.ts + verifySeedHash');
