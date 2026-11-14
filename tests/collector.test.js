"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const Collector=require("../collector");
test("deduplicates the same round across separate imports",()=>{
 const first=Collector.mergeCollections([],[{roundId:"12",finalMultiplier:2.4,sources:["OnCrash"]}]);
 const second=Collector.mergeCollections(first.rounds,[{roundId:"12",finalMultiplier:2.4,sources:["OnCrash"]}]);
 assert.equal(second.rounds.length,1);assert.equal(second.added,0);assert.equal(second.updated,1);
});
test("merges OnCrash and OnResult for one round without losing either source",()=>{
 const merged=Collector.mergeCollections([{roundId:"5",crash:3.2,finalMultiplier:3.2,sources:["OnCrash"],firstEventTime:100}],
 [{roundId:"5",resultCrash:3.2,resultUser:1.8,finalMultiplier:3.2,sources:["OnResult"],lastEventTime:200}]);
 const r=merged.rounds[0];
 assert.deepEqual(r.sources,["OnCrash","OnResult"]);assert.equal(r.crash,3.2);assert.equal(r.resultCrash,3.2);
 assert.equal(r.resultUser,1.8);assert.equal(r.mismatch,false);assert.equal(r.firstEventTime,100);assert.equal(r.lastEventTime,200);
});
test("marks source disagreement and keeps OnCrash as the final value",()=>{
 const merged=Collector.mergeCollections([{roundId:"7",crash:2.1,finalMultiplier:2.1,sources:["OnCrash"]}],
 [{roundId:"7",resultCrash:2.2,finalMultiplier:2.2,sources:["OnResult"]}]);
 assert.equal(merged.rounds[0].finalMultiplier,2.1);assert.equal(merged.rounds[0].mismatch,true);
});
test("rejects rounds without an id or a valid final multiplier",()=>{
 const result=Collector.mergeCollections([],[{roundId:"",finalMultiplier:2},{roundId:"9",finalMultiplier:0},{roundId:"10",finalMultiplier:1.4}]);
 assert.equal(result.rounds.length,1);assert.equal(result.rounds[0].roundId,"10");assert.equal(result.skipped,2);
});
