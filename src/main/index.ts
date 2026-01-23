import { app, shell, BrowserWindow, protocol, net } from 'electron'
import path from 'path'
import fs from 'fs'
import { setupIPC } from './ipc'
import { setupStreamIPC, streamManager } from './stream'
import { setupUpdater } from './updater'
import { GeminiProvider } from './providers/gemini-provider'
import { providerManager } from './providers/provider-manager'
import { ChatStorage } from './utils/chat-storage'

// 1. 强制在最顶层设置路径
const userDataPath = path.join(app.getPath('appData'), 'flyai');
app.setPath('userData', userDataPath);
app.setName('flyai');

// Fix for blank screen on macOS
app.disableHardwareAcceleration()

// Register custom protocol for chat files
protocol.registerSchemesAsPrivileged([
  { scheme: 'chat-file', privileges: { secure: true, standard: true, supportFetchAPI: true } }
])

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 18, y: 18 },
    backgroundColor: '#faf9f6',
    icon: path.join(__dirname, process.env.NODE_ENV === 'development' ? '../../build/icon.png' : '../renderer/favicon.ico'),
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
  console.log('[Main] UserData Path:', app.getPath('userData'))

  // Ensure storage directory exists immediately
  const storagePath = ChatStorage.getSessionDir('') // gets base storage/chats path
  if (!fs.existsSync(storagePath)) {
    fs.mkdirSync(storagePath, { recursive: true })
    console.log('[Main] Created storage directory:', storagePath)
  }

  // Handle chat-file protocol
  protocol.handle('chat-file', async (request) => {
    try {
      const url = new URL(request.url)
      
      // 增强鲁棒性：处理 host 为空（三个斜杠）或 host 存在（两个斜杠）的情况
      let sessionId = url.host
      let fileName = decodeURIComponent(url.pathname)
      
      if (!sessionId) {
        // 如果是 chat-file:///sessionId/filename 格式
        const parts = fileName.split('/').filter(Boolean)
        sessionId = parts[0]
        fileName = parts.slice(1).join('/')
      } else {
        // 如果是 chat-file://sessionId/filename 格式
        fileName = fileName.slice(1) // 去掉开头的 /
      }

      const filePath = path.join(app.getPath('userData'), 'storage', 'chats', sessionId, fileName)
      
      console.log('[Protocol] Attempting to serve:', filePath)
      
      if (!fs.existsSync(filePath)) {
        console.error('[Protocol] File not found on disk:', filePath)
        return new Response('File not found', { status: 404 })
      }

      const buffer = await fs.promises.readFile(filePath)
      const extension = path.extname(fileName).toLowerCase()
      const mimeMap: Record<string, string> = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp'
      }
      const mimeType = mimeMap[extension] || 'application/octet-stream'

      return new Response(buffer, {
        headers: { 
          'Content-Type': mimeType,
          'Access-Control-Allow-Origin': '*' // 允许跨域请求
        }
      })
    } catch (error) {
      console.error('[Protocol] Critical Error:', error)
      return new Response('Internal Server Error', { status: 500 })
    }
  })

  console.log('[Main] Calling setupStreamIPC...')
  setupStreamIPC()
  console.log('[Main] Calling setupIPC...')
  setupIPC()
  console.log('[Main] Registering providers...')
  providerManager.registerProvider(new GeminiProvider())

  // Setup auto-updater
  if (process.env.NODE_ENV !== 'development') {
    setupUpdater()
  }

  // Set Dock icon for macOS in development
  if (process.platform === 'darwin' && process.env.NODE_ENV === 'development' && app.dock) {
    const iconPath = path.join(__dirname, '../../build/icon.png')
    if (fs.existsSync(iconPath)) {
      app.dock.setIcon(iconPath)
    }
  }

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
