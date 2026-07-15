/** Property-based tests — Prompt 2 §8 */
import { describe, it, expect } from "vitest";
import { makePrimordialSeed, canonicalizeSeed, normalizeSeed, computeSeedHash } from "@gspl/seed-format";
import { createIrGraph, addNode, normalizeGraph, computeGraphHash } from "@gspl/ir-model";

function bytesEqual(a,b){if(a.length!==b.length)return false;for(var i=0;i<a.length;i++)if(a[i]!==b[i])return false;return true;}

describe("Canonicalization Laws",function(){
  it("normalize(normalize(x)) = normalize(x)",function(){
    var s=makePrimordialSeed({payload:{schemaVersion:"1.0",genes:{x:{type:"symbolic",value:"idempotent"}}}});
    var n1=normalizeSeed(s);
    var n2=normalizeSeed(n1);
    var b1=canonicalizeSeed(n1);
    var b2=canonicalizeSeed(n2);
    expect(bytesEqual(b1,b2)).toBe(true);
  });

  it("equal canonical bytes => equal canonical hash",function(){
    var s=makePrimordialSeed({payload:{schemaVersion:"1.0",genes:{x:{type:"symbolic",value:"hashlaw"}}}});
    var s2=makePrimordialSeed({payload:{schemaVersion:"1.0",genes:{x:{type:"symbolic",value:"hashlaw"}}}});
    var b1=canonicalizeSeed(s);
    var b2=canonicalizeSeed(s2);
    if(bytesEqual(b1,b2)){
      expect(computeSeedHash(s)).toBe(computeSeedHash(s2));
    }else{
      expect(computeSeedHash(s)).not.toBe(computeSeedHash(s2));
    }
  });

  it("semantic hashed-field change => changed hash",function(){
    var s1=makePrimordialSeed({payload:{schemaVersion:"1.0",genes:{x:{type:"symbolic",value:"A"}}}});
    var s2=makePrimordialSeed({payload:{schemaVersion:"1.0",genes:{x:{type:"symbolic",value:"B"}}}});
    expect(computeSeedHash(s1)).not.toBe(computeSeedHash(s2));
  });

  it("noncanonical field change => unchanged hash",function(){
    var s1=makePrimordialSeed({payload:{schemaVersion:"1.0",genes:{x:{type:"symbolic",value:"test"}}},validationRequirements:["a"]});
    var s2=makePrimordialSeed({payload:{schemaVersion:"1.0",genes:{x:{type:"symbolic",value:"test"}}},validationRequirements:["b"]});
    expect(computeSeedHash(s1)).toBe(computeSeedHash(s2));
  });
});

describe("Graph Laws",function(){
  it("normalizeGraph(normalizeGraph(g)) = normalizeGraph(g)",function(){
    var g=createIrGraph({seedIdentityHash:"test",compilerVersion:"1.0",canonVersion:"1.0"});
    addNode(g,{id:"n1",kind:"value",type:"symbolic",value:"x",attributes:{},provenance:{source:"default",originId:"test"}});
    var n1=normalizeGraph(g);
    var n2=normalizeGraph(n1);
    expect(n1.normalizationHash).toBe(n2.normalizationHash);
  });

  it("equivalent insertion order => equal normalized graph",function(){
    var g1=createIrGraph({seedIdentityHash:"test",compilerVersion:"1.0",canonVersion:"1.0"});
    addNode(g1,{id:"a",kind:"value",type:"symbolic",value:"1",attributes:{},provenance:{source:"default",originId:"t"}});
    addNode(g1,{id:"b",kind:"value",type:"symbolic",value:"2",attributes:{},provenance:{source:"default",originId:"t"}});
    var g2=createIrGraph({seedIdentityHash:"test",compilerVersion:"1.0",canonVersion:"1.0"});
    addNode(g2,{id:"b",kind:"value",type:"symbolic",value:"2",attributes:{},provenance:{source:"default",originId:"t"}});
    addNode(g2,{id:"a",kind:"value",type:"symbolic",value:"1",attributes:{},provenance:{source:"default",originId:"t"}});
    expect(normalizeGraph(g1).normalizationHash).toBe(normalizeGraph(g2).normalizationHash);
  });
});
