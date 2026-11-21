"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const Analytics=require("../analytics");
test("parses dot and comma decimal multipliers",()=>{
 assert.deepEqual(Analytics.parseMultipliers("1.25, 1,45\n2.00"),[1.25,1.45,2]);
});
test("summarizes only valid multipliers",()=>{
 const s=Analytics.summarize([1.2,2,5,0,NaN]);
 assert.equal(s.count,3); assert.ok(Math.abs(s.average-2.733333333333333)<1e-12);
 assert.equal(s.median,2); assert.equal(s.above2,66.66666666666666);
});
test("measures next-round threshold rates with correct denominators",()=>{
 const result=Analytics.analyzeTransitions([1.2,2.5,1.1,1.7,3.2,4.1],2);
 assert.equal(result.pairs,5);
 assert.deepEqual(result.afterBelow,{previousCount:3,nextAtOrAbove:2,rate:66.66666666666666});
 assert.deepEqual(result.afterAtOrAbove,{previousCount:2,nextAtOrAbove:1,rate:50});
 assert.equal(result.overallRate,60);
});
test("returns null rates when there are no eligible transitions",()=>{
 const result=Analytics.analyzeTransitions([1.1],2);
 assert.equal(result.pairs,0); assert.equal(result.overallRate,null);
 assert.equal(result.afterBelow.rate,null); assert.equal(result.afterAtOrAbove.rate,null);
});

test("forecast reports empirical rates and Wilson intervals",()=>{
 const f=Analytics.forecast([1,2,3,4], [2], 4);
 assert.equal(f.sampleSize,4); assert.equal(f.thresholds[0].successes,3);
 assert.equal(f.thresholds[0].rate,0.75);
 assert.ok(f.thresholds[0].low < 0.75 && f.thresholds[0].high > 0.75);
});
test("backtest uses chronological holdout only",()=>{
 const b=Analytics.backtest([1,2,3,4,5,6,7,8,9,10],0.8,[5]);
 assert.equal(b.trainSize,8); assert.equal(b.testSize,2);
 assert.equal(b.rows[0].trainHits,4); assert.equal(b.rows[0].testHits,2);
 assert.ok(Math.abs(b.rows[0].brier-0.25)<1e-12);
});
test("backtest safely handles too-small samples",()=>{
 assert.equal(Analytics.backtest([1]).testSize,0);
});
