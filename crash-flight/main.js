const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { dialog } = require('electron');
const { parseSignalRFrame } = require('./signalr-parser');

let dashboard = null;
let gameWindow = null;
let archivePath = null;
const eventArchive = [];
function persistEventArchive() {
  if (!archivePath) return;
  try {
    fs.writeFileSync(archivePath, JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), events: eventArchive.slice(-50000) }, null, 2), 'utf8');
  } catch (err) { console.error('[CRASH FLIGHT] Could not persist event archive:', err); }
}
const GAME_URL = 'https://eg1xbet.com';

const state = {
  rounds: [],
  currentRound: null,
  messageLog: [],
  lastSignalAt: null,
  stats: {
    wsConnections: 0,
    wsFrames: 0,
    signalrEvents: 0,
    saved: 0,
    lastEvent: 'لا يوجد',
    lastActivity: null,
    connectionStatus: 'لم يتم فتح نافذة اللعبة'
  }
};

function median(values) {
  const sorted = values.filter(Number.isFinite).slice().sort((a,b)=>a-b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid-1] + sorted[mid]) / 2;
}
function getInsights() {
  const completed = state.rounds.filter(r => Number.isFinite(Number(r.multiplier)));
  const recent = completed.slice(-30).map(r => Number(r.multiplier));
  const estimate = recent.length >= 5 ? median(recent) : null;
  const byRound = new Map();
  for (const e of eventArchive) {
    if (!e.roundId) continue;
    if (!byRound.has(String(e.roundId))) byRound.set(String(e.roundId), []);
    byRound.get(String(e.roundId)).push(e);
  }
  const stageLeads = new Map();
  for (const [id, events] of byRound) {
    const crash = events.find(e => e.target === 'OnCrash' || e.target === 'OnResult');
    if (!crash || !Number.isFinite(crash.receivedAtMs)) continue;
    const stages = events.filter(e => e.target === 'OnStage' && Number.isFinite(e.stage) && Number.isFinite(e.receivedAtMs) && e.receivedAtMs < crash.receivedAtMs);
    const last = stages.at(-1);
    if (!last) continue;
    const lead = (crash.receivedAtMs - last.receivedAtMs) / 1000;
    if (!stageLeads.has(last.stage)) stageLeads.set(last.stage, []);
    stageLeads.get(last.stage).push(lead);
  }
  const candidates = [...stageLeads.entries()].map(([stage, leads]) => ({stage, leads, count:leads.length, med:median(leads)})).filter(x=>x.count>=5 && x.med!==null && x.med<=5);
  candidates.sort((a,b)=>b.count-a.count);
  const candidate = candidates[0] || null;
  return {
    estimate, sampleSize: recent.length,
    alert: state.currentRound?.status === 'جارية' && candidate && Number.isFinite(state.currentRound.lastStage) && state.currentRound.lastStage === candidate.stage
      ? {level:'candidate', stage:candidate.stage, samples:candidate.count, leadSeconds:Number(candidate.med.toFixed(1))}
      : null,
    candidate: candidate ? {stage:candidate.stage, samples:candidate.count, leadSeconds:Number(candidate.med.toFixed(1))} : null
  };
}

function publish() {
  if (!dashboard || dashboard.isDestroyed()) return;
  dashboard.webContents.send('flight:state', {
    rounds: state.rounds.slice(-100),
    currentRound: state.currentRound ? { ...state.currentRound } : null,
    stats: { ...state.stats },
    messageLog: state.messageLog.slice(-30), insights: getInsights()
  });
}

function setConnectionStatus(value) {
  state.stats.connectionStatus = value;
  publish();
}

function handleGameEvent(target, args) {
  const data = Array.isArray(args) ? (args[0] || {}) : (args || {});
  const roundId = data.l ?? data.roundId ?? data.round ?? null;
  const now = new Date().toISOString();

  const receivedAt = Date.now();
  const previousAt = state.lastSignalAt;
  state.lastSignalAt = receivedAt;
  state.stats.signalrEvents += 1;
  state.stats.lastEvent = target;
  state.stats.lastActivity = now;
  const eventRecord = {
    target,
    receivedAt: now,
    receivedAtMs: receivedAt,
    gapMs: previousAt == null ? null : receivedAt - previousAt,
    roundElapsedMs: state.currentRound?.startedAt ? receivedAt - Date.parse(state.currentRound.startedAt) : null,
    roundId: roundId ?? state.currentRound?.roundId ?? null,
    stage: Number.isFinite(data.s) ? data.s : null
  };
  state.messageLog.push(eventRecord);
  eventArchive.push(eventRecord);
  if (eventArchive.length > 50000) eventArchive.shift();
  persistEventArchive();
  if (state.messageLog.length > 100) state.messageLog.shift();

  if (target === 'OnStart') {
    state.currentRound = {
      roundId,
      startedAt: now,
      status: 'جارية',
      crash: null,
      crashedAt: null
    };
  } else if (target === 'OnStage') {
    if (state.currentRound) { state.currentRound.lastStageAt = now; state.currentRound.lastStage = Number.isFinite(data.s) ? data.s : null; }
  } else if (target === 'OnCrash' || target === 'OnResult') {
    const resolvedRoundId = roundId ?? state.currentRound?.roundId ?? null;
    const result = {
      roundId: resolvedRoundId,
      crashedAt: now,
      multiplier: data.f ?? data.multiplier ?? null,
      status: 'انتهت'
    };

    if (state.currentRound &&
        (!resolvedRoundId || !state.currentRound.roundId ||
         String(resolvedRoundId) === String(state.currentRound.roundId))) {
      state.currentRound.status = 'انتهت';
      state.currentRound.crash = result.multiplier;
      state.currentRound.crashedAt = now;
    }

    const duplicate = state.rounds.some(r =>
      resolvedRoundId !== null && String(r.roundId) === String(resolvedRoundId)
    );
    if (!duplicate) state.rounds.push(result);
    state.stats.saved = state.rounds.length;
  }
  publish();
}

function attachGameMonitor(win) {
  const debuggerSession = win.webContents.debugger;
  try {
    if (!debuggerSession.isAttached()) debuggerSession.attach('1.3');
    debuggerSession.on('message', (_event, method, params) => {
      if (method === 'Network.webSocketCreated') {
        state.stats.wsConnections += 1;
        publish();
      } else if (method === 'Network.webSocketFrameReceived') {
        state.stats.wsFrames += 1;
        const payload = params?.response?.payloadData;
        if (typeof payload === 'string') {
          for (const event of parseSignalRFrame(payload)) {
            handleGameEvent(event.target, event.args);
          }
        }
        publish();
      }
    });
    debuggerSession.on('detach', () => {
      setConnectionStatus('انقطع رصد الشبكة — أعد فتح نافذة اللعبة');
    });
    debuggerSession.sendCommand('Network.enable')
      .then(() => setConnectionStatus('نافذة اللعبة مفتوحة · مراقبة WebSocket نشطة'))
      .catch(err => setConnectionStatus('تعذر تشغيل مراقبة الشبكة: ' + err.message));
  } catch (err) {
    setConnectionStatus('تعذر ربط مراقبة الشبكة: ' + err.message);
  }
}

function openGameWindow() {
  if (gameWindow && !gameWindow.isDestroyed()) {
    gameWindow.show();
    gameWindow.focus();
    return;
  }

  gameWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 900,
    minHeight: 600,
    title: 'CRASH FLIGHT · GAME',
    autoHideMenuBar: true,
    backgroundColor: '#080d17',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  attachGameMonitor(gameWindow);
  gameWindow.webContents.on('did-fail-load', (_event, code, description, url) => {
    setConnectionStatus('فشل تحميل اللعبة: ' + description);
    console.error('[CRASH FLIGHT] Game load failed:', code, description, url);
  });
  gameWindow.webContents.on('did-finish-load', () => {
    if (state.stats.connectionStatus.startsWith('لم يتم')) {
      setConnectionStatus('تم تحميل اللعبة · في انتظار اتصال WebSocket');
    }
  });
  gameWindow.on('closed', () => {
    gameWindow = null;
    setConnectionStatus('نافذة اللعبة مغلقة');
  });

  gameWindow.loadURL(GAME_URL).catch(err => {
    setConnectionStatus('تعذر فتح اللعبة: ' + err.message);
  });
}

function createDashboard() {
  dashboard = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 900,
    minHeight: 650,
    show: false,
    backgroundColor: '#070b14',
    title: 'CRASH FLIGHT',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  dashboard.once('ready-to-show', () => dashboard.show());
  dashboard.webContents.on('did-fail-load', (_event, code, description, url) => {
    console.error('[CRASH FLIGHT] Dashboard failed to load:', code, description, url);
  });
  dashboard.webContents.on('render-process-gone', (_event, details) => {
    console.error('[CRASH FLIGHT] Renderer exited:', details);
  });
  dashboard.loadFile(path.join(__dirname, 'index.html')).catch(err => {
    console.error('[CRASH FLIGHT] loadFile failed:', err);
  });
  dashboard.on('closed', () => { dashboard = null; });
}

ipcMain.handle('flight:get-state', () => ({
  rounds: state.rounds.slice(-100),
  currentRound: state.currentRound ? { ...state.currentRound } : null,
  stats: { ...state.stats },
  messageLog: state.messageLog.slice(-30), insights: getInsights()
}));
ipcMain.handle('flight:export-events', async () => {
  const result = await dialog.showSaveDialog(dashboard, {
    title: 'تصدير سجل رسائل CRASH FLIGHT',
    defaultPath: 'crash-flight-events.json',
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  fs.writeFileSync(result.filePath, JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), events: eventArchive }, null, 2), 'utf8');
  return { canceled: false, count: eventArchive.length };
});
ipcMain.handle('flight:open-game', () => {
  openGameWindow();
  return true;
});

app.whenReady().then(() => {
  archivePath = path.join(app.getPath('userData'), 'crash-flight-events.json');
  try {
    if (fs.existsSync(archivePath)) {
      const saved = JSON.parse(fs.readFileSync(archivePath, 'utf8'));
      if (Array.isArray(saved.events)) {
        eventArchive.push(...saved.events.slice(-50000));
        state.messageLog.push(...eventArchive.slice(-30));
        state.stats.signalrEvents = eventArchive.length;
        state.stats.lastEvent = state.messageLog.at(-1)?.target || 'لا يوجد';
        state.stats.lastActivity = state.messageLog.at(-1)?.receivedAt || null;
      }
    }
  } catch (err) { console.error('[CRASH FLIGHT] Could not load event archive:', err); }
  createDashboard();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createDashboard();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
