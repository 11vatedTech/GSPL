/** Package resolver tests — Prompt 2 §16 */
import { describe, it, expect } from "vitest";
import { createPackageResolver } from "../src/resolver.js";

describe("Package Resolver", function() {
  it("resolves a single package", function() {
    var r = createPackageResolver();
    r.registerPackage({ coordinate: { packageId: "test.pkg", version: "1.0.0", contentHash: "", kind: "CONTEXT" }, dependencies: [], capabilities: [], effects: [], license: "MIT", provenance: { packageId: "test.pkg", version: "1.0.0", registeredBy: "test" } });
    var result = r.resolve({ packageId: "test.pkg", version: "1.0.0", contentHash: "", kind: "CONTEXT" }, 0);
    expect(result.ok).toBe(true);
    expect(result.packages.length).toBe(1);
  });

  it("resolves transitive dependencies", function() {
    var r = createPackageResolver();
    r.registerPackage({ coordinate: { packageId: "dep.pkg", version: "1.0.0", contentHash: "", kind: "KNOWLEDGE" }, dependencies: [], capabilities: [], effects: [], license: "MIT", provenance: { packageId: "dep.pkg", version: "1.0.0", registeredBy: "test" } });
    r.registerPackage({ coordinate: { packageId: "root.pkg", version: "1.0.0", contentHash: "", kind: "CONTEXT" }, dependencies: [{ packageId: "dep.pkg", version: "1.0.0", contentHash: "", kind: "KNOWLEDGE" }], capabilities: [], effects: [], license: "MIT", provenance: { packageId: "root.pkg", version: "1.0.0", registeredBy: "test" } });
    var result = r.resolve({ packageId: "root.pkg", version: "1.0.0", contentHash: "", kind: "CONTEXT" }, 0);
    expect(result.ok).toBe(true);
    expect(result.packages.length).toBe(2);
  });

  it("detects missing packages", function() {
    var r = createPackageResolver();
    var result = r.resolve({ packageId: "missing", version: "1.0.0", contentHash: "", kind: "CONTEXT" }, 0);
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("rejects duplicate packages with different content", function() {
    var r = createPackageResolver();
    r.registerPackage({ coordinate: { packageId: "dup", version: "1.0.0", contentHash: "", kind: "CONTEXT" }, dependencies: [], capabilities: [], effects: [], license: "MIT", provenance: { packageId: "dup", version: "1.0.0", registeredBy: "test" } });
    expect(function() {
      r.registerPackage({ coordinate: { packageId: "dup", version: "1.0.0", contentHash: "", kind: "CONTEXT" }, dependencies: [], capabilities: [], effects: [], license: "MIT", provenance: { packageId: "dup", version: "1.0.0", registeredBy: "test" } });
    }).toThrow();
  });

  it("rejects packages without license when required", function() {
    var r = createPackageResolver({ requireLicense: true });
    expect(function() {
      r.registerPackage({ coordinate: { packageId: "nolic", version: "1.0.0", contentHash: "", kind: "CONTEXT" }, dependencies: [], capabilities: [], effects: [], provenance: { packageId: "nolic", version: "1.0.0", registeredBy: "test" } });
    }).toThrow();
  });

  it("enforces dependency depth limit", function() {
    var r = createPackageResolver({ maxDependencyDepth: 1 });
    r.registerPackage({ coordinate: { packageId: "deep2", version: "1.0.0", contentHash: "", kind: "CONTEXT" }, dependencies: [], capabilities: [], effects: [], license: "MIT", provenance: { packageId: "deep2", version: "1.0.0", registeredBy: "test" } });
    r.registerPackage({ coordinate: { packageId: "deep1", version: "1.0.0", contentHash: "", kind: "CONTEXT" }, dependencies: [{ packageId: "deep2", version: "1.0.0", contentHash: "", kind: "CONTEXT" }], capabilities: [], effects: [], license: "MIT", provenance: { packageId: "deep1", version: "1.0.0", registeredBy: "test" } });
    r.registerPackage({ coordinate: { packageId: "root", version: "1.0.0", contentHash: "", kind: "CONTEXT" }, dependencies: [{ packageId: "deep1", version: "1.0.0", contentHash: "", kind: "CONTEXT" }], capabilities: [], effects: [], license: "MIT", provenance: { packageId: "root", version: "1.0.0", registeredBy: "test" } });
    var result = r.resolve({ packageId: "root", version: "1.0.0", contentHash: "", kind: "CONTEXT" }, 0);
    expect(result.ok).toBe(false);
    expect(result.errors.some(function(e) { return e.code === "MAX_DEPTH"; })).toBe(true);
  });

  it("produces deterministic lockfile", function() {
    var r1 = createPackageResolver();
    r1.registerPackage({ coordinate: { packageId: "a", version: "1.0.0", contentHash: "", kind: "CONTEXT" }, dependencies: [], capabilities: [], effects: [], license: "MIT", provenance: { packageId: "a", version: "1.0.0", registeredBy: "test" } });
    r1.resolve({ packageId: "a", version: "1.0.0", contentHash: "", kind: "CONTEXT" }, 0);
    var h1 = r1.computeLockHash();
    var r2 = createPackageResolver();
    r2.registerPackage({ coordinate: { packageId: "a", version: "1.0.0", contentHash: "", kind: "CONTEXT" }, dependencies: [], capabilities: [], effects: [], license: "MIT", provenance: { packageId: "a", version: "1.0.0", registeredBy: "test" } });
    r2.resolve({ packageId: "a", version: "1.0.0", contentHash: "", kind: "CONTEXT" }, 0);
    var h2 = r2.computeLockHash();
    expect(h1).toBe(h2);
  });

  // ── §8 NEW — real coverage of resolution policies + invariants ──

  it("LOCKFILE_REQUIRED policy rejects resolution when store is empty", function() {
    var r = createPackageResolver({ resolutionPolicy: "LOCKFILE_REQUIRED" });
    var result = r.resolve({ packageId: "ghost", version: "1.0.0", contentHash: "", kind: "CONTEXT" }, 0);
    expect(result.ok).toBe(false);
    expect(result.errors.some(function(e) { return e.code === "LOCK_REQUIRED"; })).toBe(true);
  });

  it("LOCKFILE_REQUIRED policy honors populated store", function() {
    var r = createPackageResolver({ resolutionPolicy: "LOCKFILE_REQUIRED" });
    r.registerPackage({ coordinate: { packageId: "live", version: "1.0.0", contentHash: "", kind: "CONTEXT" }, dependencies: [], capabilities: [], effects: [], license: "MIT", provenance: { packageId: "live", version: "1.0.0", registeredBy: "t" } });
    var result = r.resolve({ packageId: "live", version: "1.0.0", contentHash: "", kind: "CONTEXT" }, 0);
    expect(result.ok).toBe(true);
  });

  it("EXACT_ONLY policy does not silently upgrade or downgrade versions", function() {
    var r = createPackageResolver({ resolutionPolicy: "EXACT_ONLY" });
    r.registerPackage({ coordinate: { packageId: "exact", version: "1.2.3", contentHash: "", kind: "CONTEXT" }, dependencies: [], capabilities: [], effects: [], license: "MIT", provenance: { packageId: "exact", version: "1.2.3", registeredBy: "t" } });
    // Asking for 1.2.4 should NOT silently resolve to 1.2.3
    var miss = r.resolve({ packageId: "exact", version: "1.2.4", contentHash: "", kind: "CONTEXT" }, 0);
    expect(miss.ok).toBe(false);
    expect(miss.errors.some(function(e) { return e.code === "NOT_FOUND"; })).toBe(true);
    // Asking for exact 1.2.3 resolves
    var hit = r.resolve({ packageId: "exact", version: "1.2.3", contentHash: "", kind: "CONTEXT" }, 0);
    expect(hit.ok).toBe(true);
  });

  it("tampered content triggers HASH_MISMATCH error", function() {
    var r = createPackageResolver();
    var pkg = { coordinate: { packageId: "tamper", version: "1.0.0", contentHash: "sha256:" + "0".repeat(64), kind: "CONTEXT" as const }, dependencies: [], capabilities: [], effects: [], license: "MIT", provenance: { packageId: "tamper", version: "1.0.0", registeredBy: "t" }, loadedContent: { foo: "BAR" } };
    r.registerPackage(pkg);
    var result = r.resolve(pkg.coordinate, 0);
    expect(result.ok).toBe(false);
    expect(result.errors.some(function(e) { return e.code === "HASH_MISMATCH"; })).toBe(true);
  });

  it("setRoot propagates rootSeedId and rootSeedHash into lockfile", function() {
    var r = createPackageResolver();
    r.setRoot("test-root-1", "sha256:" + "1".repeat(64));
    r.registerPackage({ coordinate: { packageId: "p", version: "1.0.0", contentHash: "", kind: "CONTEXT" }, dependencies: [], capabilities: [], effects: [], license: "MIT", provenance: { packageId: "p", version: "1.0.0", registeredBy: "t" } });
    var result = r.resolve({ packageId: "p", version: "1.0.0", contentHash: "", kind: "CONTEXT" }, 0);
    expect(result.lockfile.rootSeedId).toBe("test-root-1");
    expect(result.lockfile.rootSeedHash).toBe("sha256:" + "1".repeat(64));
    expect(result.lockfile.lockHash.startsWith("sha256:")).toBe(true);
  });

  it("lockfile preserves deterministic package ordering across insertion sequences", function() {
    function lock(pre: string[]) {
      var r = createPackageResolver();
      r.setRoot("ord-root", "sha256:" + "0".repeat(64));
      for (var i = 0; i < pre.length; i++) {
        r.registerPackage({ coordinate: { packageId: pre[i], version: "1.0.0", contentHash: "", kind: "CONTEXT" }, dependencies: [], capabilities: [], effects: [], license: "MIT", provenance: { packageId: pre[i], version: "1.0.0", registeredBy: "t" } });
      }
      for (var j = 0; j < pre.length; j++) {
        r.resolve({ packageId: pre[j], version: "1.0.0", contentHash: "", kind: "CONTEXT" }, 0);
      }
      return r.computeLockHash();
    }
    var hInsertAB = lock(["alpha", "beta", "gamma"]);
    var hInsertBA = lock(["gamma", "alpha", "beta"]);
    expect(hInsertAB).toBe(hInsertBA);
  });

  it("resolves three-deep transitive dependency chain", function() {
    var r = createPackageResolver();
    r.registerPackage({ coordinate: { packageId: "leaf", version: "1.0.0", contentHash: "", kind: "KNOWLEDGE" }, dependencies: [], capabilities: [], effects: [], license: "MIT", provenance: { packageId: "leaf", version: "1.0.0", registeredBy: "t" } });
    r.registerPackage({ coordinate: { packageId: "mid", version: "1.0.0", contentHash: "", kind: "CONTEXT" }, dependencies: [{ packageId: "leaf", version: "1.0.0", contentHash: "", kind: "KNOWLEDGE" }], capabilities: [], effects: [], license: "MIT", provenance: { packageId: "mid", version: "1.0.0", registeredBy: "t" } });
    r.registerPackage({ coordinate: { packageId: "root", version: "1.0.0", contentHash: "", kind: "CONTEXT" }, dependencies: [{ packageId: "mid", version: "1.0.0", contentHash: "", kind: "CONTEXT" }], capabilities: [], effects: [], license: "MIT", provenance: { packageId: "root", version: "1.0.0", registeredBy: "t" } });
    var result = r.resolve({ packageId: "root", version: "1.0.0", contentHash: "", kind: "CONTEXT" }, 0);
    expect(result.ok).toBe(true);
    expect(result.packages.length).toBe(3);
    expect(result.lockfile.dependencyEdges.length).toBe(2);
  });

  it("rejects disallowed kinds before resolution", function() {
    var r = createPackageResolver({ allowedKinds: ["CONTEXT"] });
    expect(function() {
      r.registerPackage({ coordinate: { packageId: "x", version: "1.0.0", contentHash: "", kind: "RULE" }, dependencies: [], capabilities: [], effects: [], license: "MIT", provenance: { packageId: "x", version: "1.0.0", registeredBy: "t" } });
    }).toThrow(/Disallowed/);
  });

  it("lockfile schema identifier is gspl.package-lock and schemaVersion is 1.0", function() {
    var r = createPackageResolver();
    r.registerPackage({ coordinate: { packageId: "sch", version: "1.0.0", contentHash: "", kind: "CONTEXT" }, dependencies: [], capabilities: [], effects: [], license: "MIT", provenance: { packageId: "sch", version: "1.0.0", registeredBy: "t" } });
    var result = r.resolve({ packageId: "sch", version: "1.0.0", contentHash: "", kind: "CONTEXT" }, 0);
    expect(result.lockfile.schema).toBe("gspl.package-lock");
    expect(result.lockfile.schemaVersion).toBe("1.0");
  });
});
