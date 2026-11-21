const test = require('node:test');
const assert = require('node:assert/strict');
const { parseSignalRFrame } = require('./signalr-parser');

test('parses multiple SignalR events separated by record separator', () => {
  const input = JSON.stringify({ type: 1, target: 'OnStart', arguments: [{ l: 123 }] }) +
    String.fromCharCode(30) +
    JSON.stringify({ type: 1, target: 'OnCrash', arguments: [{ l: 123, f: 2.5 }] }) +
    String.fromCharCode(30);
  assert.deepEqual(parseSignalRFrame(input), [
    { target: 'OnStart', args: [{ l: 123 }] },
    { target: 'OnCrash', args: [{ l: 123, f: 2.5 }] }
  ]);
});

test('ignores handshake, completion, malformed and non-string frames', () => {
  assert.deepEqual(parseSignalRFrame('{"type":6}\u001e{"type":3}\u001enot-json\u001e'), []);
  assert.deepEqual(parseSignalRFrame(null), []);
});
