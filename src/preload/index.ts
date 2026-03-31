import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  // Tabs
  loadTabs: () => ipcRenderer.invoke('tabs:load'),
  saveTabs: (tabs) => ipcRenderer.send('tabs:save', tabs),
  updateTab: (id, updates) => ipcRenderer.send('tab:update', id, updates),
  loadTabGroups: () => ipcRenderer.invoke('tabGroups:load'),
  saveTabGroups: (groups) => ipcRenderer.send('tabGroups:save', groups),
  importFile: (path: string) => ipcRenderer.invoke('tab:importFile', path),
  exportFile: (content: string, label: string, format: string) => ipcRenderer.invoke('tab:exportFile', { content, label, format }),
  getHash: (text: string, algorithm: string) => ipcRenderer.invoke('crypto:hash', { text, algorithm }),
  getRandom: (min: number, max: number) => ipcRenderer.invoke('utility:random', { min, max }),
  
  // Settings
  loadSettings: () => ipcRenderer.invoke('settings:load'),
  updateSettings: (settings) => ipcRenderer.send('settings:update', settings),
  
  // Crypto
  unlockVault: (passphrase) => ipcRenderer.invoke('crypto:unlock', passphrase),
  isUnlocked: () => ipcRenderer.invoke('crypto:isUnlocked'),
  lockVault: () => ipcRenderer.invoke('crypto:lock'),
  setTabEncrypted: (tabId, encrypted) => ipcRenderer.invoke('crypto:setEncrypted', { tabId, encrypted }),
  getNeedsUnlock: () => ipcRenderer.invoke('crypto:getNeedsUnlock'),
  exportVault: () => ipcRenderer.invoke('crypto:exportVault'),
  importVault: () => ipcRenderer.invoke('crypto:importVault'),
  
  // Auth
  login: () => ipcRenderer.invoke('auth:login'),
  logout: () => ipcRenderer.invoke('auth:logout'),
  getAuthStatus: () => ipcRenderer.invoke('auth:status'),
  
  // Sync
  syncNow: () => ipcRenderer.invoke('sync:now'),
  getSyncStatus: () => ipcRenderer.invoke('sync:status'),
  
  // Window controls
  close: () => ipcRenderer.send('window:close'),
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  
  // Event listeners
  onTabCreate: (callback) => {
    const listener = (_: any, value: any) => callback(value)
    ipcRenderer.on('tab:create', listener)
    return () => ipcRenderer.removeListener('tab:create', listener)
  },
  onTabFocus: (callback) => {
    const listener = (_: any, id: string) => callback(id)
    ipcRenderer.on('tab:focus', listener)
    return () => ipcRenderer.removeListener('tab:focus', listener)
  },
  onSettingsSync: (callback) => {
    const listener = (_: any, settings: any) => callback(settings)
    ipcRenderer.on('settings:sync', listener)
    return () => ipcRenderer.removeListener('settings:sync', listener)
  },
  onThemeChanged: (callback) => {
    const listener = (_: any, theme: string) => callback(theme)
    ipcRenderer.on('theme:changed', listener)
    return () => ipcRenderer.removeListener('theme:changed', listener)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
