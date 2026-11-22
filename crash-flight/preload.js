const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('flight', {
  getState: () => ipcRenderer.invoke('flight:get-state'),
  openGame: () => ipcRenderer.invoke('flight:open-game'),
  exportEvents: () => ipcRenderer.invoke('flight:export-events'),
  onState: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('flight:state', listener);
    return () => ipcRenderer.removeListener('flight:state', listener);
  }
});
