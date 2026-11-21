"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const Forecast=require("../forecast");
test("cleans invalid multipliers and reports empirical threshold probabilities",()=>{
 const p=Forecast.probabilities([1,2,3,0,NaN], [2])[0];
 assert.equal(p.count,3);assert.equal(p.successes,2);assert.ok(Math.abs(p.probability-2/3)<1e-12);
 assert.ok(p.low<p.probability&&p.high>p.probability);
});
test("does not invent probabilities for an empty sample",()=>{
 const p=Forecast.forecastNext([], [2]).probabilities[0];
 assert.equal(p.count,0);assert.equal(p.probability,0);assert.deepEqual({low:p.low,high:p.high},{low:0,high:1});
});
test("backtest is chronological and reports baseline and rolling Brier scores",()=>{
 const values=Array.from({length:300},(_,i)=>i%4===0?3:1.2);
 const result=Forecast.backtest(values,{trainRatio:.8,window:100,minHistory:50,thresholds:[2]});
 assert.equal(result.trainCount,240);assert.equal(result.testCount,60);
 assert.equal(result.results[0].observations,60);
 assert.ok(result.results[0].staticBrier>=0&&result.results[0].staticBrier<=1);
 assert.ok(result.results[0].rollingBrier>=0&&result.results[0].rollingBrier<=1);
});
test("brier score evaluates probability forecasts against binary outcomes",()=>{
 assert.ok(Math.abs(Forecast.brierScore([.8,.2],[true,false])-.04)<1e-12);
});
