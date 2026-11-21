"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {collect}=require("../extension/timing-fields.js");

test("finds timing candidates in nested event payloads",()=>{
 const found=collect({round:{state:2,meta:{remainingTime:4200,deadline:"2030-01-01T00:00:00Z"}},player:{balance:99}});
 assert.deepEqual(found,{"round.meta.remainingTime":4200,"round.meta.deadline":"2030-01-01T00:00:00Z"});
});

test("ignores unrelated values and bounds traversal",()=>{
 const found=collect({balance:100,profile:{name:"user"},items:[{remainingTime:5}],timer:0});
 assert.deepEqual(found,{timer:0});
});

test("does not recurse indefinitely through cyclic objects",()=>{
 const value={remainingTime:12};value.self=value;
 assert.deepEqual(collect(value),{remainingTime:12});
});
