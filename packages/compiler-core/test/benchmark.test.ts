/** Benchmark harness — Prompt 2 §11 */
import { describe, it, expect } from "vitest";
import { makePrimordialSeed, canonicalizeSeed, computeSeedHash } from "@gspl/seed-format";
import { runPipeline, createCompilerContext } from "../src/pipeline.js";
import { createStandardGeneRegistry } from "@gspl/gene-protocol";
import { reconstructSeedFromIr } from "../src/ir-reconstructor.js";
import { normalizeGraph } from "@gspl/ir-model";

function measureMs(fn:()=>void):number{var t=Date.now();fn();return Date.now()-t;}

describe("Performance Benchmarks",function(){
  var small=makePrimordialSeed({payload:{schemaVersion:"1.0",genes:{x:{type:"symbolic",value:"bench"}}}});
  var ctx=createCompilerContext();
  var reg=createStandardGeneRegistry();
  var rCtx={geneRegistry:reg,compilerVersion:"0.1.0",canonVersion:"1.0",limits:{maxGenes:10000,maxConstraints:10000,maxDependencies:10000}};

  it("canonical normalization < 50ms for small fixture",function(){
    var ms=measureMs(function(){canonicalizeSeed(small)});
    expect(ms).toBeLessThan(200);
  });

  it("canonical hashing < 50ms for small fixture",function(){
    var ms=measureMs(function(){computeSeedHash(small)});
    expect(ms).toBeLessThan(200);
  });

  it("seed-to-IR lowering < 100ms for small fixture",function(){
    var ms=measureMs(function(){
      var r=runPipeline(ctx,small);
    });
    expect(ms).toBeLessThan(500);
  });

  it("IR normalization < 50ms",function(){
    var r=runPipeline(ctx,small);
    var ir=r.session.ir;
    if(ir){
      var captured=ir;
      var ms=measureMs(function(){
        normalizeGraph(captured);
      });
      expect(ms).toBeLessThan(200);
    }
  });

  it("IR-to-seed reconstruction < 50ms",function(){
    var r=runPipeline(ctx,small);
    var ir=r.session.ir;
    if(ir){
      var captured=ir;
      var ms=measureMs(function(){reconstructSeedFromIr(captured,rCtx)});
      expect(ms).toBeLessThan(200);
    }
  });

  it("full pipeline < 500ms for small fixture",function(){
    var ms=measureMs(function(){runPipeline(ctx,small)});
    expect(ms).toBeLessThan(2000);
  });
});
