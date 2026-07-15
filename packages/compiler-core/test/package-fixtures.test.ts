/** Package fixture tests — Prompt 2 §5 */
import { describe, it, expect } from "vitest";
import { createPackageResolver } from "../../package-resolver/src/resolver.js";
import { makePrimordialSeed } from "@gspl/seed-format";
import { runPipeline, createCompilerContext } from "../src/pipeline.js";

// Create sample fixtures
function createContextPackage() {
  return {
    coordinate: { packageId: "com.11vatedtech.context.test-env", version: "1.0.0", contentHash: "", kind: "CONTEXT" as const },
    dependencies: [],
    capabilities: ["timezone-info"],
    effects: [],
    license: "MIT",
    provenance: { packageId: "com.11vatedtech.context.test-env", version: "1.0.0", registeredBy: "11vatedtech" },
    loadedContent: { timezone: "UTC", locale: "en-US", nodeVersion: "20.0.0" }
  };
}

function createKnowledgePackage() {
  return {
    coordinate: { packageId: "com.11vatedtech.knowledge.arch-patterns", version: "1.0.0", contentHash: "", kind: "KNOWLEDGE" as const },
    dependencies: [],
    capabilities: ["architecture-patterns"],
    effects: [],
    license: "MIT",
    provenance: { packageId: "com.11vatedtech.knowledge.arch-patterns", version: "1.0.0", registeredBy: "11vatedtech" },
    loadedContent: { patterns: ["layered", "repository", "cqrs"], constraints: ["no-circular-deps"] }
  };
}

function createRulePackage() {
  return {
    coordinate: { packageId: "com.11vatedtech.rules.codegen", version: "1.0.0", contentHash: "", kind: "RULE" as const },
    dependencies: [],
    capabilities: ["code-generation-rules"],
    effects: [],
    license: "MIT",
    provenance: { packageId: "com.11vatedtech.rules.codegen", version: "1.0.0", registeredBy: "11vatedtech" },
    loadedContent: { rules: [{ match: "struct", target: "interface" }, { match: "expression", target: "function" }] }
  };
}

function createGeneExtensionPackage() {
  return {
    coordinate: { packageId: "com.11vatedtech.genes.custom-color", version: "1.0.0", contentHash: "", kind: "GENE_EXTENSION" as const },
    dependencies: [],
    capabilities: ["custom-gene-color"],
    effects: [],
    license: "MIT",
    provenance: { packageId: "com.11vatedtech.genes.custom-color", version: "1.0.0", registeredBy: "11vatedtech" },
    loadedContent: { geneType: "color", schema: { type: "object", properties: { r: "number", g: "number", b: "number", a: "number" } } }
  };
}

describe("Package Fixtures", function() {
  it("resolves context package", function() {
    var r = createPackageResolver();
    r.registerPackage(createContextPackage());
    var result = r.resolve({ packageId: "com.11vatedtech.context.test-env", version: "1.0.0", contentHash: "", kind: "CONTEXT" }, 0);
    expect(result.ok).toBe(true);
    expect(result.packages[0].capabilities).toContain("timezone-info");
  });

  it("resolves knowledge package", function() {
    var r = createPackageResolver();
    r.registerPackage(createKnowledgePackage());
    var result = r.resolve({ packageId: "com.11vatedtech.knowledge.arch-patterns", version: "1.0.0", contentHash: "", kind: "KNOWLEDGE" }, 0);
    expect(result.ok).toBe(true);
  });

  it("resolves rule package", function() {
    var r = createPackageResolver();
    r.registerPackage(createRulePackage());
    var result = r.resolve({ packageId: "com.11vatedtech.rules.codegen", version: "1.0.0", contentHash: "", kind: "RULE" }, 0);
    expect(result.ok).toBe(true);
  });

  it("resolves gene extension package", function() {
    var r = createPackageResolver();
    r.registerPackage(createGeneExtensionPackage());
    var result = r.resolve({ packageId: "com.11vatedtech.genes.custom-color", version: "1.0.0", contentHash: "", kind: "GENE_EXTENSION" }, 0);
    expect(result.ok).toBe(true);
  });

  it("tampered package fails hash verification", function() {
    var r = createPackageResolver();
    var pkg = createContextPackage();
    // Tamper with loaded content (cast to bypass TS2739 partial-fields check).
    pkg.loadedContent = { timezone: "TAMPERED" } as { timezone: string; locale: string; nodeVersion: string };
    // Set a stale preemptive contentHash so verifyHash actually runs and detects mismatch.
    pkg.coordinate.contentHash = "sha256:deadbeef";
    r.registerPackage(pkg);
    var result = r.resolve(pkg.coordinate, 0);
    expect(result.ok).toBe(false);
    expect(result.errors.some(function(e) { return e.code === "HASH_MISMATCH"; })).toBe(true);
  });

  it("all four package kinds can coexist", function() {
    var r = createPackageResolver();
    r.registerPackage(createContextPackage());
    r.registerPackage(createKnowledgePackage());
    r.registerPackage(createRulePackage());
    r.registerPackage(createGeneExtensionPackage());
    expect(r.getStore().size).toBe(4);
  });
});
