import { ipcMain, app } from 'electron'
import db from './database'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import path from 'path'

export function setupIPC() {
  console.log('🚀 IPC: Setting up handlers')

  // Settings
  ipcMain.handle('get-setting', (_, key: string) => {
    console.log(`⚙️ IPC: Get setting - ${key}`)
    const stmt = db.prepare('SELECT value FROM settings WHERE key = ?')
    const row = stmt.get(key) as { value: string } | undefined
    return row ? row.value : null
  })

  ipcMain.handle('save-setting', (_, key: string, value: string) => {
    console.log(`⚙️ IPC: Save setting - ${key} = ${value?.slice(0, 50)}`)
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
    stmt.run(key, value)
  })

  // Sessions
  ipcMain.handle('create-session', (_, title: string = 'New Chat') => {
    console.log('📝 IPC: Create session -', title)
    const id = uuidv4()
    const stmt = db.prepare('INSERT INTO sessions (id, title, created_at) VALUES (?, ?, ?)')
    stmt.run(id, title, Date.now())
    console.log('✅ IPC: Session created -', id)
    return id
  })

  ipcMain.handle('get-sessions', () => {
    console.log('📚 IPC: Get all sessions')
    const stmt = db.prepare('SELECT * FROM sessions ORDER BY created_at DESC')
    const sessions = stmt.all()
    console.log(`✅ IPC: Retrieved ${sessions.length} sessions`)
    return sessions
  })

  ipcMain.handle('update-session-title', (_, { sessionId, title }) => {
    console.log('✏️ IPC: Update session title -', sessionId, '-', title)
    const stmt = db.prepare('UPDATE sessions SET title = ? WHERE id = ?')
    stmt.run(title, sessionId)
  })

  ipcMain.handle('delete-session', (_, sessionId: string) => {
    console.log('🗑️ IPC: Delete session -', sessionId)
    const stmt = db.prepare('DELETE FROM sessions WHERE id = ?')
    stmt.run(sessionId)

    // Delete associated images folder
    const sessionImagesDir = path.join(app.getPath('userData'), 'images', sessionId)
    if (fs.existsSync(sessionImagesDir)) {
      fs.rmSync(sessionImagesDir, { recursive: true, force: true })
      console.log('🗑️ IPC: Deleted session images folder:', sessionImagesDir)
    }
    console.log('✅ IPC: Session deleted')
  })

  // Messages
  ipcMain.handle('get-messages', (_, sessionId: string) => {
    console.log('💬 IPC: Get messages for session -', sessionId)
    const stmt = db.prepare('SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC')
    const messages = stmt.all(sessionId)
    console.log(`✅ IPC: Retrieved ${messages.length} messages`)
    return messages
  })

  ipcMain.handle('save-message', (_, { sessionId, role, content, type = 'text', attachments = null }) => {
    const preview = content.slice(0, 50)
    console.log(`💾 IPC: Save message - ${role} - ${preview}...`)
    const startTime = Date.now()

    const id = uuidv4()
    const stmt = db.prepare('INSERT INTO messages (id, session_id, role, content, type, attachments, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    const attachmentsStr = attachments ? JSON.stringify(attachments) : null
    stmt.run(id, sessionId, role, content, type, attachmentsStr, Date.now())

    const elapsed = Date.now() - startTime
    console.log(`✅ IPC: Message saved in ${elapsed}ms -`, id)
    return id
  })

  // Get Image - returns base64 data for display
  ipcMain.handle('get-image', (_, sessionId, filename) => {
    console.log('🖼️ IPC: Get image -', sessionId, '-', filename)
    const startTime = Date.now()

    const sessionImagesDir = path.join(app.getPath('userData'), 'images', sessionId)
    const filePath = path.join(sessionImagesDir, filename)

    if (!fs.existsSync(filePath)) {
      console.error('❌ IPC: Image file not found:', filePath)
      return null
    }

    try {
      const buffer = fs.readFileSync(filePath)
      const base64 = buffer.toString('base64')
      // Detect MIME type from extension
      const ext = path.extname(filename).toLowerCase()
      const mimeMap: Record<string, string> = {
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.gif': 'image/gif',
          '.webp': 'image/webp',
          '.svg': 'image/svg+xml',
          '.bmp': 'image/bmp',
          '.tiff': 'image/tiff'
      }
      const mimeType = mimeMap[ext] || 'image/png'

      const elapsed = Date.now() - startTime
      console.log(`✅ IPC: Image loaded in ${elapsed}ms -`, buffer.length, 'bytes')

      return `data:${mimeType};base64,${base64}`
    } catch (e) {
      console.error('❌ IPC: Failed to read image:', e)
      return null
    }
  })

  // Image Saving - save to session-specific directory
  ipcMain.handle('save-image', (_, { base64, mimeType, sessionId }) => {
    console.log('📸 IPC: Save image -', mimeType, '- session:', sessionId)
    const startTime = Date.now()

    const sessionImagesDir = path.join(app.getPath('userData'), 'images', sessionId)
    if (!fs.existsSync(sessionImagesDir)) {
      fs.mkdirSync(sessionImagesDir, { recursive: true })
      console.log('📁 IPC: Created session images directory')
    }

    // Better MIME type to extension mapping
    const mimeToExt: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
      'image/bmp': 'bmp',
      'image/tiff': 'tiff'
    }

    const ext = mimeToExt[mimeType.toLowerCase()] || mimeType.split('/')[1] || 'png'
    const filename = `${uuidv4()}.${ext}`
    const filePath = path.join(sessionImagesDir, filename)

    const base64Length = base64.length
    const estimatedSize = Math.round((base64Length * 3) / 4) // Approximate decoded size
    console.log(`💾 IPC: Writing image - ~${estimatedSize} bytes`)

    const buffer = Buffer.from(base64, 'base64')
    fs.writeFileSync(filePath, buffer)

    const elapsed = Date.now() - startTime
    console.log(`✅ IPC: Image saved in ${elapsed}ms -`, filename)

    return `${sessionId}/${filename}` // Return sessionId/filename for storage
  })

  console.log('✅ IPC: All handlers registered')
}