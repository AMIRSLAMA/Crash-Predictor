"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const Decoder=require("../decoder");
const RS=String.fromCharCode(30);
const frame=(target,data)=>JSON.stringify({type:1,target,arguments:[data]});
test("parses SignalR record separators and pairs OnStart with OnCrash",()=>{
 const raw=frame("OnStart",{l:44,ts:100})+RS+frame("OnCrash",{l:44,f:3.68,ts:200})+RS;
 const report=Decoder.analyze(raw);
 assert.equal(report.total,2); assert.equal(report.counts.starts,1);
 assert.equal(report.completed.length,1); assert.equal(report.completed[0].roundId,"44");
 assert.equal(report.completed[0].finalMultiplier,3.68); assert.deepEqual(report.completed[0].sources,["OnCrash"]);
});
test("parses OnResult and reconciles it with OnCrash regardless of event order",()=>{
 const raw=frame("OnResult",{l:55,f:2.75,k:1.8,t:123})+RS+frame("OnCrash",{l:55,f:2.75,ts:200})+RS;
 const report=Decoder.analyze(raw),round=report.completed[0];
 assert.equal(report.counts.results,1); assert.equal(round.finalMultiplier,2.75);
 assert.equal(round.resultCrash,2.75); assert.equal(round.resultUser,1.8); assert.equal(report.events[0].timestamp,123);
 assert.equal(round.mismatch,false); assert.deepEqual(round.sources,["OnCrash","OnResult"]);
});
test("keeps an OnResult-only round and exposes disagreement",()=>{
 const report=Decoder.analyze(frame("OnCrash",{l:9,f:3.2})+RS+frame("OnResult",{l:9,f:3.21,k:2})+RS);
 assert.equal(report.completed.length,1); assert.equal(report.completed[0].mismatch,true);
 assert.equal(report.completed[0].finalMultiplier,3.2);
 const onlyResult=Decoder.analyze(frame("OnResult",{l:10,f:4.4})+RS);
 assert.equal(onlyResult.completed[0].finalMultiplier,4.4);
 assert.deepEqual(onlyResult.completed[0].sources,["OnResult"]);
});
test("does not mistake cashouts or profits for crash results",()=>{
 const raw=frame("OnCashouts",{l:9,q:[{k:1.44}]})+RS+frame("OnProfits",{l:9,q:[{v:733.69}]});
 const report=Decoder.analyze(raw);
 assert.equal(report.counts.cashouts,1); assert.equal(report.counts.profits,1); assert.equal(report.completed.length,0);
});
test("accepts round id zero and counts malformed frames safely",()=>{
 const raw=frame("OnCrash",{l:0,f:1.01})+RS+"not-json"+RS+"{}"+RS;
 const report=Decoder.analyze(raw);
 assert.equal(report.completed[0].roundId,"0"); assert.equal(report.total,1); assert.equal(report.ignored,2);
});
