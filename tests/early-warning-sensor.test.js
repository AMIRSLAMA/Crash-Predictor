"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {createSensor,candidateKeys}=require("../extension/sensor-core.js");

test("measures time from the last OnStage event to OnCrash",()=>{
 const sensor=createSensor();
 sensor.observe("OnStart",{l:101},1000);
 sensor.observe("OnStage",{l:101,s:2},1800);
 const result=sensor.observe("OnCrash",{l:101,f:2.4},2500);
 assert.equal(result.measurement.roundId,"101");
 assert.equal(result.measurement.startedToCrashMs,1500);
 assert.equal(result.measurement.lastStageToCrashMs,700);
 assert.equal(result.measurement.stageCount,1);
});

test("records possible countdown field names without treating them as a prediction",()=>{
 assert.deepEqual(candidateKeys({timeRemaining:5000,deadline:"2026-11-21T12:00:00Z",multiplier:4}),["timeRemaining","deadline"]);
 const sensor=createSensor();
 sensor.observe("OnStart",{l:102},100);
 sensor.observe("OnStage",{l:102,timeRemaining:5000},200);
 const result=sensor.observe("OnCrash",{l:102,f:3},600);
 assert.deepEqual(result.measurement.countdownCandidateKeys,["timeRemaining"]);
});

test("does not invent a start time when OnStart was not observed",()=>{
 const sensor=createSensor();
 sensor.observe("OnStage",{l:103,s:1},100);
 const result=sensor.observe("OnCrash",{l:103,f:1.5},350);
 assert.equal(result.measurement.startedToCrashMs,null);
 assert.equal(result.measurement.lastStageToCrashMs,250);
});

test("detects candidate timing fields in a pre-round event but does not claim a countdown",()=>{
 const sensor=createSensor();
 const result=sensor.observe("OnBetting",{l:104,remainingTime:4200},500);
 assert.equal(result.type,"signal");
 assert.deepEqual(result.candidateKeys,["remainingTime"]);
});
