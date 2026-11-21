const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('flight', {
  getState: () => ipcRenderer.invoke('flight:get-state'),
  openGame: () => ipcRenderer.invoke('flight:open-game'),
  onState: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('flight:state', listener);
    return () => ipcRenderer.removeListener('flight:state', listener);
  }
});
