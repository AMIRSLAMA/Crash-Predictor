"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const P=require("../probability");
test("filters invalid multipliers and estimates threshold rates",()=>{
 const r=P.estimate([1,1.5,2,3,0,NaN],{windowSize:30});
 assert.equal(r.sampleSize,4);
 assert.equal(r.thresholds.find(x=>x.threshold===2).successes,2);
 assert.equal(r.thresholds.find(x=>x.threshold===2).probability,.5);
});
test("Wilson interval contains observed rate",()=>{
 const x=P.rate([1,2,3,4],2);
 assert.ok(x.interval.low<=x.probability);
 assert.ok(x.interval.high>=x.probability);
});
test("walk-forward backtest never trains on the current or future round",()=>{
 const a=Array.from({length:140},(_,i)=>i<100?1.1:5);
 const r=P.backtest(a,{minimum:100,windowSize:30});
 assert.equal(r.testedRounds,40);
 assert.equal(r.scores[0].n,40);
 assert.ok(r.scores.every(x=>Number.isFinite(x.rollingBrier)));
});
test("empty backtest returns no misleading score",()=>{
 const r=P.backtest([1,2,3],{minimum:100});
 assert.equal(r.testedRounds,0);
 assert.equal(r.scores[0].rollingBrier,null);
});
