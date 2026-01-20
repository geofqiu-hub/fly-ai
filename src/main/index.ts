import { app, shell, BrowserWindow, protocol, net } from 'electron'
import path from 'path'
import fs from 'fs'
import { setupIPC } from './ipc'
import { pathToFileURL } from 'url'

// Fix for blank screen on macOS: Disable hardware acceleration
app.disableHardwareAcceleration()

console.log('🚀 Main: Starting FlyAi application')
console.log('🔧 Main: Hardware acceleration disabled')

// Register custom protocol to serve local images securely
// This MUST be called before app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'flyai', privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: true } }
])
console.log('🔐 Main: Custom protocol registered')

function createWindow(): void {
  console.log('🪟 Main: Creating browser window')
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
    console.log('✅ Main: Window ready to show')
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    console.log('🔗 Main: External link requested -', details.url)
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env.NODE_ENV === 'development') {
    console.log('🛠️ Main: Loading development server')
    mainWindow.loadURL('http://localhost:5173')
    // mainWindow.webContents.openDevTools()
  } else {
    console.log('📦 Main: Loading production build')
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  console.log('✅ Main: Browser window created')
}

app.whenReady().then(() => {
  console.log('⚡ Main: App ready, setting up protocol and IPC')

  // SINGLE Protocol Handler for 'flyai'
  protocol.handle('flyai', (request) => {
    try {
      const urlPath = request.url.replace('flyai://', '')
      console.log('🖼️ Protocol: Image request -', urlPath)

      const filename = decodeURIComponent(urlPath)
      const filePath = path.join(app.getPath('userData'), 'images', filename)

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.error('❌ Protocol: Image file not found:', filePath)
        return new Response('Image not found', { status: 404 })
      }

      console.log('✅ Protocol: Serving image -', filePath)
      // Convert to file:// URL properly
      return net.fetch(pathToFileURL(filePath).toString())
    } catch (e) {
      console.error('❌ Protocol Error:', e)
      return new Response('Not Found', { status: 404 })
    }
  })
  console.log('✅ Main: Custom protocol handler registered')

  setupIPC()
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  console.log('✅ Main: Application fully initialized')
})

app.on('window-all-closed', () => {
  console.log('🪟 Main: All windows closed')
  if (process.platform !== 'darwin') {
    console.log('👋 Main: Quitting application')
    app.quit()
  }
})
