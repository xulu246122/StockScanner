const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.invoke('window-minimize'),
  minimizeToTray: () => ipcRenderer.invoke('window-minimize-to-tray'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
  show: () => ipcRenderer.invoke('window-show'),
  hide: () => ipcRenderer.invoke('window-hide'),
  quit: () => ipcRenderer.invoke('app-quit'),
  showNativeNotification: (payload) => ipcRenderer.invoke('show-native-notification', payload),
  onCloseRequest: (callback) => {
    ipcRenderer.on('request-close-action', () => callback());
  },
  onNavigateToTab: (callback) => {
    ipcRenderer.on('navigate-to-tab', (_event, tab) => callback(tab));
  },
  onAlertNotificationClicked: (callback) => {
    ipcRenderer.on('alert-notification-clicked', (_event, data) => callback(data));
  },
  isElectron: true
});
