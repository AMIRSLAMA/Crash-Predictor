"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const Audit=require("../sequence-analysis");
test("classifies the previous multiplier into stable buckets",()=>{
  assert.equal(Audit.previousBucket(1.2),"low");
  assert.equal(Audit.previousBucket(1.8),"mid");
  assert.equal(Audit.previousBucket(3.2),"high");
  assert.equal(Audit.previousBucket(8),"very-high");
});
test("caps trailing low streak state at three",()=>{
  assert.equal(Audit.trailingLowStreak([1.1,1.2,1.3,1.4],4),3);
  assert.equal(Audit.trailingLowStreak([1.1,2.1,1.2],3),1);
});
test("walk-forward audit keeps the test chronological and bounded",()=>{
  const values=Array.from({length:300},(_,i)=>i%5===0?4:1.2);
  const report=Audit.walkForwardSequenceAudit(values,{trainRatio:.8,minHistory:100,thresholds:[2]});
  assert.equal(report.trainCount,240);
  assert.equal(report.testCount,60);
  assert.equal(report.results[0].observations,60);
  for(const key of ["baselineBrier","bucketBrier","streakBrier"])
    assert.ok(report.results[0][key]>=0&&report.results[0][key]<=1);
});
test("does not report an evaluation when history is too short",()=>{
  const report=Audit.walkForwardSequenceAudit([1.2,2,1.1],{minHistory:100});
  assert.equal(report.testCount,0);
  assert.equal(report.results.length,0);
});
