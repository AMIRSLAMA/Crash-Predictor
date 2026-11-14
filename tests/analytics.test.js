const test = require("node:test");
const assert = require("node:assert/strict");
const A = require("../analytics.js");

test("parses decimal multipliers and ignores values below 1", () => {
  assert.deepEqual(A.parseMultipliers("1.25, 2, 0.80\n3.5"), [1.25,2,3.5]);
});
test("summarizes average, median and threshold percentages", () => {
  const s = A.summarize([1,2,3,6]);
  assert.equal(s.count,4); assert.equal(s.average,3); assert.equal(s.median,2.5);
  assert.equal(s.above2,75); assert.equal(s.above5,25);
});
test("finds low streak at the end of history", () => {
  assert.equal(A.summarize([1.2,4,1.1,1.4]).lowStreak,2);
});
test("bucket counts add up to total", () => {
  const b=A.buckets([1.1,1.8,2.5,5,12]);
  assert.equal(b.reduce((n,x)=>n+x.count,0),5);
});
test("empty input returns safe summary", () => {
  assert.equal(A.summarize([]).count,0);
});
