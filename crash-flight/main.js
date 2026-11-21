const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const { parseSignalRFrame } = require('./signalr-parser');

let dashboard = null;
let gameWindow = null;
const GAME_URL = 'https://eg1xbet.com';

const state = {
  rounds: [],
  currentRound: null,
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

function publish() {
  if (!dashboard || dashboard.isDestroyed()) return;
  dashboard.webContents.send('flight:state', {
    rounds: state.rounds.slice(-100),
    currentRound: state.currentRound ? { ...state.currentRound } : null,
    stats: { ...state.stats }
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

  state.stats.signalrEvents += 1;
  state.stats.lastEvent = target;
  state.stats.lastActivity = now;

  if (target === 'OnStart') {
    state.currentRound = {
      roundId,
      startedAt: now,
      status: 'جارية',
      crash: null,
      crashedAt: null
    };
  } else if (target === 'OnStage') {
    if (state.currentRound) state.currentRound.lastStageAt = now;
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
  stats: { ...state.stats }
}));
ipcMain.handle('flight:open-game', () => {
  openGameWindow();
  return true;
});

app.whenReady().then(() => {
  createDashboard();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createDashboard();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
