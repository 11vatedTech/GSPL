/** Content-Addressed Package Resolver — Prompt 2 §4, §16 */
import { createHash } from "node:crypto";
function pkgKey(coord) { return coord.packageId + "@" + coord.version; }
var DEFAULT_CONFIG = Object.freeze({ allowedKinds: Object.freeze(["CONTEXT", "KNOWLEDGE", "RULE", "GENE_EXTENSION", "TARGET_PROFILE"]), maxDependencyDepth: 32, requireLicense: true, requireProvenance: true, resolutionPolicy: "LOCKFILE_REQUIRED" });
export function createPackageResolver(config) {
    var cfg = Object.freeze({ ...DEFAULT_CONFIG, ...config });
    var store = new Map();
    var rootSeedId = "";
    var rootSeedHash = "";
    function registerPackage(pkg) {
        var key = pkgKey(pkg.coordinate);
        if (store.has(key))
            throw new Error("Duplicate: " + key);
        if (!cfg.allowedKinds.includes(pkg.coordinate.kind))
            throw new Error("Disallowed: " + pkg.coordinate.kind);
        if (cfg.requireLicense && !pkg.license)
            throw new Error("Missing license: " + key);
        if (cfg.requireProvenance && !pkg.provenance)
            throw new Error("Missing provenance: " + key);
        store.set(key, Object.freeze(pkg));
    }
    function setRoot(seedId, seedHash) { rootSeedId = seedId; rootSeedHash = seedHash; }
    function verifyHash(pkg) {
        if (!pkg.coordinate.contentHash)
            return true;
        try {
            var loaded = JSON.stringify(pkg.loadedContent ?? {});
            var actual = createHash("sha256").update(loaded).digest("hex");
            return "sha256:" + actual === pkg.coordinate.contentHash;
        }
        catch (e) {
            return false;
        }
    }
    function resolve(coord, depth, visited) {
        var localEdges = [];
        var errors = [];
        var resolved = [];
        var visitedSet = visited || new Set();
        if (depth > cfg.maxDependencyDepth) {
            errors.push({ code: "MAX_DEPTH", packageId: coord.packageId, message: "Limit: " + depth });
            return { ok: false, packages: resolved, lockfile: buildLockfile(resolved, localEdges), errors: errors };
        }
        var key = pkgKey(coord);
        if (visitedSet.has(key)) {
            errors.push({ code: "CYCLE", packageId: coord.packageId, message: "Cycle: " + key });
            return { ok: false, packages: resolved, lockfile: buildLockfile(resolved, localEdges), errors: errors };
        }
        visitedSet.add(key);
        if (cfg.resolutionPolicy === "LOCKFILE_REQUIRED" && cfg.resolutionPolicy !== "EXACT_ONLY") { /* LOCKFILE_REQUIRED = exact only */ }
        var pkg = store.get(key);
        if (!pkg) {
            errors.push({ code: "NOT_FOUND", packageId: coord.packageId, message: "Not found: " + key });
            return { ok: false, packages: resolved, lockfile: buildLockfile(resolved, localEdges), errors: errors };
        }
        if (!verifyHash(pkg)) {
            errors.push({ code: "HASH_MISMATCH", packageId: coord.packageId, message: "Hash mismatch: " + key });
            return { ok: false, packages: resolved, lockfile: buildLockfile(resolved, localEdges), errors: errors };
        }
        resolved.push(pkg);
        for (var i = 0; i < pkg.dependencies.length; i++) {
            var dep = pkg.dependencies[i];
            localEdges.push({ from: pkg.coordinate, to: dep });
            var sub = resolve(dep, depth + 1, new Set(visitedSet));
            if (!sub.ok) {
                errors.push(...sub.errors);
                return { ok: false, packages: resolved, lockfile: buildLockfile(resolved, localEdges), errors: errors };
            }
            for (var j = 0; j < sub.packages.length; j++) {
                var sk = pkgKey(sub.packages[j].coordinate);
                if (!resolved.some(function (r) { return pkgKey(r.coordinate) === sk; }))
                    resolved.push(sub.packages[j]);
            }
        }
        return { ok: true, packages: resolved, lockfile: buildLockfile(resolved, localEdges), errors: [] };
    }
    function buildLockfile(packages, localEdges) {
        var lockEdges = [...localEdges];
        var lockPkgs = packages.map(function (p) { return { coordinate: p.coordinate, dependencies: p.dependencies, capabilities: p.capabilities, effects: p.effects, license: p.license, provenance: p.provenance }; });
        var parts = [rootSeedId, rootSeedHash];
        var sortedPkgs = [...lockPkgs].sort(function (a, b) { return pkgKey(a.coordinate).localeCompare(pkgKey(b.coordinate)); });
        for (var i = 0; i < sortedPkgs.length; i++) {
            parts.push(pkgKey(sortedPkgs[i].coordinate) + ":" + sortedPkgs[i].coordinate.contentHash);
        }
        var lockHash = "sha256:" + createHash("sha256").update(parts.join(", ")).digest(", hex, ");));
        return Object.freeze({ schema: "gspl.package-lock", schemaVersion: "1.0", rootSeedId: rootSeedId, rootSeedHash: rootSeedHash, resolutionPolicy: cfg.resolutionPolicy, packages: Object.freeze(sortedPkgs), dependencyEdges: Object.freeze(lockEdges), lockHash: lockHash });
    }
    function computeLockHash() { return buildLockfile([...store.values()], []).lockHash; }
    function getStoreSnapshot() { return new Map(store); }
    function getLockfileSnapshot() { return buildLockfile([...store.values()], []); }
    return { registerPackage, setRoot, resolve, verifyHash, computeLockHash, getStore: getStoreSnapshot, getLockfile: getLockfileSnapshot };
}
//# sourceMappingURL=resolver.js.map