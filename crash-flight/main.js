const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');

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
  if (typeof payload !== 'string') return;
  // SignalR JSON protocol commonly separates messages with ASCII record separator.
  for (const chunk of payload.split(String.fromCharCode(30))) {
    const trimmed = chunk.trim();
    if (!trimmed || trimmed[0] !== '{') continue;
    try {
      const msg = JSON.parse(trimmed);
      if (msg.type === 1 && typeof msg.target === 'string') emitGameEvent(msg.target, msg.arguments);
    } catch { /* Ignore non-JSON/binary frames; never store raw payloads. */ }
  }
}

function attachObserver(win) {
  const dbg = win.webContents.debugger;
  try {
    if (!dbg.isAttached()) dbg.attach('1.3');
    dbg.sendCommand('Network.enable').catch(() => {});
    dbg.on('message', (_event, method, params) => {
      if (method === 'Network.webSocketCreated') wsConnections++;
      if (method === 'Network.webSocketFrameReceived') {
        wsFrames++;
        inspectFrame(params?.response?.payloadData);
        if (wsFrames % 10 === 0) publish();
      }
    });
    dbg.on('detach', () => { lastEvent = 'انفصل مراقب الشبكة'; publish(); });
  } catch (error) {
    lastEvent = 'تعذر تفعيل مراقبة WebSocket';
    publish();
  }
}

function createDashboard() {
  dashboard = new BrowserWindow({
    width: 1120, height: 760, minWidth: 900, minHeight: 620,
    backgroundColor: '#070b14',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
  });
  dashboard.loadFile('index.html');
  dashboard.on('closed', () => { dashboard = null; });
}

function createGameWindow() {
  gameWindow = new BrowserWindow({
    width: 1200, height: 850, minWidth: 800, minHeight: 600,
    title: 'CRASH FLIGHT · نافذة اللعبة',
    backgroundColor: '#080d18',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  gameWindow.loadURL(GAME_URL);
  gameWindow.webContents.once('dom-ready', () => attachObserver(gameWindow));
  gameWindow.on('closed', () => { gameWindow = null; });
}

app.whenReady().then(() => {
  ipcMain.handle('flight:open-game', () => {
    if (!gameWindow) createGameWindow();
    else gameWindow.focus();
    return true;
  });
  ipcMain.handle('flight:get-state', () => ({
    rounds, currentRound,
    stats: { wsConnections, wsFrames, signalrEvents, saved: rounds.length, lastEvent, lastActivity }
  }));
  createDashboard();
  createGameWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createDashboard(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
