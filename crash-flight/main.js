const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('node:path');

let dashboard;

const initialState = {
  rounds: [],
  currentRound: null,
  stats: {
    wsConnections: 0,
    wsFrames: 0,
    signalrEvents: 0,
    saved: 0,
    lastEvent: 'لا يوجد',
    lastActivity: null
  }
};

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

ipcMain.handle('flight:get-state', () => initialState);
ipcMain.handle('flight:open-game', async () => {
  await shell.openExternal('https://eg1xbet.com');
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
