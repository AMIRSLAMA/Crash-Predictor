"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const Decoder=require("../decoder");
const RS=String.fromCharCode(30);
test("parses SignalR record separators and extracts known game events",()=>{
 const raw='{"type":1,"target":"OnStart","arguments":[{"l":44,"ts":100}]}' + RS + '{"type":1,"target":"OnCrash","arguments":[{"l":44,"f":3.68,"ts":200}]}' + RS;
 const report=Decoder.analyze(raw);
 assert.equal(report.total,2);
 assert.equal(report.counts.starts,1);
 assert.equal(report.completed.length,1);
 assert.equal(report.completed[0].roundId,"44");
 assert.equal(report.completed[0].crash,3.68);
});
test("does not mistake cashouts or profits for crash results",()=>{
 const raw='{"type":1,"target":"OnCashouts","arguments":[{"l":9,"q":[{"k":1.44}]}]}' + RS + '{"type":1,"target":"OnProfits","arguments":[{"l":9,"q":[{"v":733.69}]}]}';
 const report=Decoder.analyze(raw);
 assert.equal(report.counts.cashouts,1);
 assert.equal(report.counts.profits,1);
 assert.equal(report.completed.length,0);
});
test("counts malformed and non-game frames without crashing",()=>{
 const report=Decoder.analyze("not-json" + RS + "{}" + RS);
 assert.equal(report.total,0);
 assert.equal(report.ignored,2);
});
