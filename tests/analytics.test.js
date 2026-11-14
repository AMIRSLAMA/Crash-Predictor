"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const Analytics=require("../analytics");
test("parses dot and comma decimal multipliers",()=>{
 assert.deepEqual(Analytics.parseMultipliers("1.25, 1,45\n2.00"),[1.25,1.45,2]);
});
test("summarizes only valid multipliers",()=>{
 const s=Analytics.summarize([1.2,2,5,0,NaN]);
 assert.equal(s.count,3); assert.equal(s.average,2.7333333333333334);
 assert.equal(s.median,2); assert.equal(s.above2,66.66666666666666);
});
test("measures next-round threshold rates with correct denominators",()=>{
 const result=Analytics.analyzeTransitions([1.2,2.5,1.1,1.7,3.2,4.1],2);
 assert.equal(result.pairs,5);
 assert.deepEqual(result.afterBelow,{previousCount:2,nextAtOrAbove:1,rate:50});
 assert.deepEqual(result.afterAtOrAbove,{previousCount:3,nextAtOrAbove:2,rate:66.66666666666666});
 assert.equal(result.overallRate,60);
});
test("returns null rates when there are no eligible transitions",()=>{
 const result=Analytics.analyzeTransitions([1.1],2);
 assert.equal(result.pairs,0); assert.equal(result.overallRate,null);
 assert.equal(result.afterBelow.rate,null); assert.equal(result.afterAtOrAbove.rate,null);
});
