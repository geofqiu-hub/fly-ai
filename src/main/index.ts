import { app, shell, BrowserWindow } from 'electron'
import path from 'path'
import { setupIPC } from './ipc'
import { setupStreamIPC, streamManager } from './stream'
import { GeminiProvider } from './providers/gemini-provider'
import { providerManager } from './providers/provider-manager'

// Fix for blank screen on macOS
app.disableHardwareAcceleration()

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 18, y: 18 },
    backgroundColor: '#faf9f6',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  console.log('[Main] App ready, setting up...')
  console.log('[Main] Calling setupStreamIPC...')
  setupStreamIPC()
  console.log('[Main] Calling setupIPC...')
  setupIPC()
  console.log('[Main] Registering providers...')
  providerManager.registerProvider(new GeminiProvider())
  console.log('[Main] Creating window...')
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  streamManager.stopAllStreams()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
