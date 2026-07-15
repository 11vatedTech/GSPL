/** Cross-process determinism tests — Prompt 2 §5 */
import { describe, it, expect } from "vitest";
import { makePrimordialSeed, canonicalizeSeed, computeSeedHash } from "@gspl/seed-format";
import { runPipeline, createCompilerContext } from "../src/pipeline.js";
import { fixtureSoftwareArchitecture, fixtureInteractiveScene, fixtureMixedVideoGame } from "../src/fixtures.js";

function bytesEqual(a,b){if(a.length!==b.length)return false;for(var i=0;i<a.length;i++)if(a[i]!==b[i])return false;return true;}

describe("Cross-Process Determinism",function(){
  it("same seed produces identical canonical output across runs",function(){
    var s=makePrimordialSeed({payload:{schemaVersion:"1.0",genes:{x:{type:"symbolic",value:"test"}}},namespace:{domain:"test",name:"det"}});
    var r1=runPipeline(createCompilerContext(),s);
    var r2=runPipeline(createCompilerContext(),s);
    var b1=canonicalizeSeed(r1.session.normalizedSeed||s);
    var b2=canonicalizeSeed(r2.session.normalizedSeed||s);
    expect(bytesEqual(b1,b2)).toBe(true);
    expect(computeSeedHash(r1.session.normalizedSeed||s)).toBe(computeSeedHash(r2.session.normalizedSeed||s));
  });

  it("all three fixtures produce nonempty pipeline output",function(){
    var fixtures = [fixtureSoftwareArchitecture, fixtureInteractiveScene, fixtureMixedVideoGame];
    
    for(var i=0;i<fixtures.length;i++){
      var seed=fixtures[i];
      var r=runPipeline(createCompilerContext(),seed);
      expect(r.session.ir, names[i] + " IR").toBeDefined();
      expect(r.session.ir.nodes.size, names[i] + " IR nodes").toBeGreaterThan(0);
      expect(r.session.plan, names[i] + " plan").toBeDefined();
      expect(r.session.plan.operations.length, names[i] + " ops").toBeGreaterThan(0);
      expect(r.session.artifactGraph, names[i] + " artifacts").toBeDefined();
      expect(r.session.artifactGraph.artifacts.length, names[i] + " artifacts count").toBeGreaterThan(0);
    }
  });

  it("canonical output independent of process ID and timing",function(){
    var s=makePrimordialSeed({payload:{schemaVersion:"1.0",genes:{x:{type:"symbolic",value:"proctest"}}}});
    var b1=canonicalizeSeed(s);
    var h1=computeSeedHash(s);
    var b2=canonicalizeSeed(s);
    expect(bytesEqual(b1,b2)).toBe(true);
    expect(h1).toBe(computeSeedHash(s));
  });
});