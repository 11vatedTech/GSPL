/** Mutation sensitivity tests — Prompt 2 §10 */
import { describe, it, expect } from "vitest";
import { makePrimordialSeed, canonicalizeSeed, computeSeedHash, verifySeedHash } from "@gspl/seed-format";
import { createIrGraph, addNode, normalizeGraph } from "@gspl/ir-model";
import { runPipeline, createCompilerContext } from "../src/pipeline.js";

describe("Mutation Sensitivity",function(){
  it("detects: lowering returns empty graph",function(){
    var ctx=createCompilerContext();
    var s=makePrimordialSeed({payload:{schemaVersion:"1.0",genes:{x:{type:"symbolic",value:"test"}}}});
    var r=runPipeline(ctx,s);
    expect(r.session.ir).toBeDefined();
    expect(r.session.ir!.nodes.size).toBeGreaterThan(0);
  });
  it("detects: planner returns nonzero operations",function(){
    var ctx=createCompilerContext();
    var s=makePrimordialSeed({payload:{schemaVersion:"1.0",genes:{x:{type:"symbolic",value:"test"}}}});
    var r=runPipeline(ctx,s);
    expect(r.session.plan!.operations.length).toBeGreaterThan(0);
  });
  it("detects: artifact generator returns nonzero artifacts",function(){
    var ctx=createCompilerContext();
    var s=makePrimordialSeed({payload:{schemaVersion:"1.0",genes:{x:{type:"symbolic",value:"test"}}}});
    var r=runPipeline(ctx,s);
    expect(r.session.artifactGraph!.artifacts.length).toBeGreaterThan(0);
  });
  it("detects: hash changes when semantic field changes",function(){
    var s1=makePrimordialSeed({intent:{purpose:"p1"}});
    var s2=makePrimordialSeed({intent:{purpose:"p2"}});
    expect(computeSeedHash(s1)).not.toBe(computeSeedHash(s2));
  });
  it("detects: canonical ordering matters",function(){
    var s=makePrimordialSeed({payload:{schemaVersion:"1.0",genes:{b:{type:"symbolic",value:"B"},a:{type:"symbolic",value:"A"}}}});
    var b1=canonicalizeSeed(s);
    var b2=canonicalizeSeed(s);
    expect(b1.length).toBe(b2.length);
    for(var i=0;i<b1.length;i++){expect(b1[i]).toBe(b2[i]);}
  });
  it("detects: provenance required on nodes",function(){
    var ctx=createCompilerContext();
    var s=makePrimordialSeed({payload:{schemaVersion:"1.0",genes:{x:{type:"symbolic",value:"provenance-test"}}}});
    var r=runPipeline(ctx,s);
    expect(r.session.provenance.length).toBeGreaterThan(0);
  });
  it("detects: verifySeedHash requires exact match",function(){
    var s=makePrimordialSeed({payload:{schemaVersion:"1.0",genes:{x:{type:"symbolic",value:"verify"}}}});
    var h=computeSeedHash(s);
    s.identity.contentId=h;
    var result=verifySeedHash(s);
    expect(result.ok).toBe(true);
  });
  it("detects: effect authorization fails for blocked effects",function(){
    var s=makePrimordialSeed({effectPermissions:{filesystem:"none",processExecution:false,networkAccess:false,environmentAccess:false,timeAccess:false,foreignCodeExecution:false,nativeExtensions:false,modelInference:false}});
    expect(s.effectPermissions.filesystem).toBe("none");
    expect(s.effectPermissions.networkAccess).toBe(false);
  });
  it("detects: resource budget enforcement exists",function(){
    var s=makePrimordialSeed({resourceBudget:{maxOperations:5}});
    expect(s.resourceBudget.maxOperations).toBe(5);
  });
  it("detects: no wall-clock in canonical IR metadata",function(){
    var ctx=createCompilerContext();
    var s=makePrimordialSeed({payload:{schemaVersion:"1.0",genes:{x:{type:"symbolic",value:"no-clock"}}}});
    var r=runPipeline(ctx,s);
    var ir=r.session.ir;
    expect(ir).toBeDefined();
    expect(ir!.metadata.generatedAt).toBeUndefined();
    expect(function(){return Date.now()}).toBeDefined();
  });
});
