const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('appConfig', {
  isElectron: true,
  apiBase: 'http://localhost:3456',
})
