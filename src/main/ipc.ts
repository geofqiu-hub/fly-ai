import { ipcMain } from 'electron'
import db from './database'
import { v4 as uuidv4 } from 'uuid'

export function setupIPC() {
  // Settings
  ipcMain.handle('get-setting', (_, key: string) => {
    const stmt = db.prepare('SELECT value FROM settings WHERE key = ?')
    const row = stmt.get(key) as { value: string } | undefined
    return row ? row.value : null
  })

  ipcMain.handle('save-setting', (_, key: string, value: string) => {
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
    stmt.run(key, value)
  })

  // Sessions
  ipcMain.handle('create-session', (_, title: string = 'New Chat') => {
    const id = uuidv4()
    const stmt = db.prepare('INSERT INTO sessions (id, title, created_at) VALUES (?, ?, ?)')
    stmt.run(id, title, Date.now())
    return id
  })

  ipcMain.handle('get-sessions', () => {
    const stmt = db.prepare('SELECT * FROM sessions ORDER BY created_at DESC')
    return stmt.all()
  })

  ipcMain.handle('update-session-title', (_, { sessionId, title }) => {
    const stmt = db.prepare('UPDATE sessions SET title = ? WHERE id = ?')
    stmt.run(title, sessionId)
  })

  ipcMain.handle('delete-session', (_, sessionId: string) => {
    const stmt = db.prepare('DELETE FROM sessions WHERE id = ?')
    stmt.run(sessionId)
  })

  // Messages
  ipcMain.handle('get-messages', (_, sessionId: string) => {
    const stmt = db.prepare('SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC')
    return stmt.all(sessionId)
  })

  ipcMain.handle('save-message', (_, { sessionId, role, content, type = 'text', attachments = null }) => {
    const id = uuidv4()
    const stmt = db.prepare('INSERT INTO messages (id, session_id, role, content, type, attachments, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    const attachmentsStr = attachments ? JSON.stringify(attachments) : null
    stmt.run(id, sessionId, role, content, type, attachmentsStr, Date.now())
    return id
  })

  // Agents
  ipcMain.handle('get-agents', () => {
    const stmt = db.prepare('SELECT * FROM agents ORDER BY created_at DESC')
    return stmt.all()
  })

  ipcMain.handle('get-agent', (_, agentId: string) => {
    const stmt = db.prepare('SELECT * FROM agents WHERE id = ?')
    return stmt.get(agentId)
  })

  ipcMain.handle('save-agent', (_, { id, name, description, systemPrompt, avatarColor, temperature, isPreset = false }) => {
    const agentId = id || uuidv4()
    const now = Date.now()

    if (id) {
      const stmt = db.prepare('UPDATE agents SET name = ?, description = ?, system_prompt = ?, avatar_color = ?, temperature = ?, updated_at = ? WHERE id = ?')
      stmt.run(name, description, systemPrompt, avatarColor, temperature, now, id)
    } else {
      const stmt = db.prepare('INSERT INTO agents (id, name, description, system_prompt, avatar_color, temperature, is_preset, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      stmt.run(agentId, name, description, systemPrompt, avatarColor, temperature, isPreset ? 1 : 0, now, now)
    }
    return agentId
  })

  ipcMain.handle('delete-agent', (_, agentId: string) => {
    const stmt = db.prepare('DELETE FROM agents WHERE id = ? AND is_preset = 0')
    const result = stmt.run(agentId)
    return result.changes > 0
  })

  // Preset Agents
  ipcMain.handle('get-preset-agents', () => {
    return []
  })

  ipcMain.handle('create-agent-from-preset', () => {
    return null
  })

  // Session-Agent association
  ipcMain.handle('update-session-agent', (_, { sessionId, agentId }) => {
    const stmt = db.prepare('UPDATE sessions SET agent_id = ? WHERE id = ?')
    stmt.run(agentId || null, sessionId)
  })
}
