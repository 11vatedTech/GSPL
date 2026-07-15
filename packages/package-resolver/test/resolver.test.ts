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
    var r = createPackageResolver({ maxDependencyDepth: 2 });
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
});
