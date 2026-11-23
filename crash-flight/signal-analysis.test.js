const test = require('node:test');
const assert = require('node:assert/strict');
const { analyzeStageSignals } = require('./signal-analysis');

function makeRounds(leads, stage = 7) {
  const events = [];
  leads.forEach((lead, index) => {
    const start = index * 100000;
    events.push({ target: 'OnStart', roundId: index + 1, receivedAtMs: start });
    events.push({ target: 'OnStage', roundId: index + 1, stage, receivedAtMs: start + 10000 });
    events.push({ target: 'OnCrash', roundId: index + 1, receivedAtMs: start + 10000 + lead * 1000 });
  });
  return events;
}

test('requires repeated, consistent 1–5 second stage timing', () => {
  const events = makeRounds([2.8, 3, 3.2, 2.9, 3.1]);
  const current = { status: 'جارية', lastStage: 7 };
  const result = analyzeStageSignals(events, current);
  assert.equal(result.candidate.stage, 7);
  assert.equal(result.candidate.samples, 5);
  assert.equal(result.candidate.precision, 100);
  assert.equal(result.alert.level, 'experimental');
});

test('does not promote inconsistent timing to an alert', () => {
  const events = makeRounds([3, 3, 3, 18, 18]);
  const result = analyzeStageSignals(events, { status: 'جارية', lastStage: 7 });
  assert.equal(result.candidate, null);
  assert.equal(result.alert, null);
});

test('does not alert before minimum completed-round sample size', () => {
  const result = analyzeStageSignals(makeRounds([3, 3, 3, 3]), { status: 'جارية', lastStage: 7 });
  assert.equal(result.candidate, null);
  assert.equal(result.alert, null);
});

test('does not alert on a different live stage', () => {
  const result = analyzeStageSignals(makeRounds([3, 3, 3, 3, 3]), { status: 'جارية', lastStage: 8 });
  assert.equal(result.candidate.stage, 7);
  assert.equal(result.alert, null);
});
