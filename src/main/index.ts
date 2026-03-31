import { app, shell, BrowserWindow, globalShortcut } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { storageService } from './services/StorageService'
import { setupTabIpc } from './ipc/tabs'
import { setupCryptoIpc } from './ipc/crypto'
import { cryptoService } from './services/CryptoService'
import { TrayService } from './services/TrayService'
import { registerAuthHandlers } from './ipc/auth'
import { registerSyncHandlers } from './ipc/sync'
import { registerSettingsHandlers } from './ipc/settings'
import { syncService } from './services/SyncService'

let mainWindow: BrowserWindow | null = null
let isQuitting = false

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    minWidth: 480,
    minHeight: 320,
    show: false,
    frame: false, // Custom title bar
    backgroundColor: '#00000000',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Windows 11 Mica material
  if (process.platform === 'win32') {
    mainWindow.setBackgroundMaterial('mica')
  }

  const { nativeTheme } = require('electron')
  nativeTheme.on('updated', () => {
    mainWindow?.webContents.send('theme:changed', nativeTheme.shouldUseDarkColors ? 'dark' : 'light')
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('close', (e) => {
    const settings = storageService.getSettings()
    if (settings.closeToTray && !isQuitting) {
      e.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.notevault')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Init crypto
  const cryptoMeta = storageService.getCryptoMeta()
  if (cryptoMeta) {
    await cryptoService.init(cryptoMeta.salt)
  }

  const auth = storageService.getAuth()
  if (auth) {
    // If we have auth, we can derive the key from account
    cryptoService.setKeyFromAccount(auth.userId, '')
  }

  setupTabIpc()
  setupCryptoIpc()
  registerAuthHandlers()
  registerSyncHandlers()
  registerSettingsHandlers()
  
  await syncService.init()
  
  createWindow()

  // Register tray service
  if (mainWindow) {
    new TrayService(mainWindow)
    
    // Windows 11 Accent Color
    const { systemPreferences } = require('electron')
    const updateAccentColor = () => {
       const accent = systemPreferences.getAccentColor();
       mainWindow?.webContents.executeJavaScript(
         `document.documentElement.style.setProperty('--color-accent', '#${accent.slice(0, 6)}')`
       );
    };
    updateAccentColor();
    systemPreferences.on('accent-color-changed', updateAccentColor);
  }

  // Global shortcut to show/hide window
  const settings = storageService.getSettings()
  globalShortcut.register(settings.globalShortcut || 'Ctrl+Shift+N', () => {
    if (mainWindow) {
      if (mainWindow.isVisible() && mainWindow.isFocused()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    }
  })

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  // Watch for network connectivity to flush sync queue
  const { net } = require('electron')
  setInterval(() => {
      if (net.isOnline()) {
          syncService.flushQueue();
      }
  }, 30000); // Check every 30s as a fallback
})

app.on('before-quit', () => {
  isQuitting = true
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
