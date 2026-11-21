const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const { parseSignalRFrame } = require('./signalr-parser');

let dashboard;
let gameWindow;
let rounds = [];
let currentRound = null;
let wsFrames = 0;
let signalrEvents = 0;
let wsConnections = 0;
let lastEvent = 'لا يوجد';
let lastActivity = null;

const GAME_URL = 'https://eg1xbet.com';

function publish() {
  if (!dashboard || dashboard.isDestroyed()) return;
  dashboard.webContents.send('flight:state', {
    rounds: rounds.slice(-100),
    currentRound,
    stats: { wsConnections, wsFrames, signalrEvents, saved: rounds.length, lastEvent, lastActivity }
  });
}

function emitGameEvent(target, args) {
  const data = Array.isArray(args) ? (args[0] || {}) : (args || {});
  const roundId = data.l ?? data.roundId ?? data.round ?? null;
  const now = new Date().toISOString();
  signalrEvents++;
  lastEvent = target;
  lastActivity = now;

  if (target === 'OnStart') {
    currentRound = { roundId, startedAt: now, status: 'جارية', crash: null };
  } else if (target === 'OnStage') {
    if (currentRound) currentRound.lastStageAt = now;
  } else if (target === 'OnCrash' || target === 'OnResult') {
    const result = { roundId: roundId ?? currentRound?.roundId ?? null, crashedAt: now, multiplier: data.f ?? null, status: 'انتهت' };
    if (currentRound && (!roundId || !currentRound.roundId || String(roundId) === String(currentRound.roundId))) {
      currentRound.status = 'انتهت';
      currentRound.crash = result.multiplier;
      currentRound.crashedAt = now;
    }
    if (!rounds.some(r => String(r.roundId) === String(result.roundId) && result.roundId !== null)) rounds.push(result);
  }
  publish();
}

function inspectFrame(payload) {
  for (const event of parseSignalRFrame(payload)) emitGameEvent(event.target, event.args);
}

