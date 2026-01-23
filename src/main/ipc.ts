import { ipcMain, app, dialog } from 'electron'
import db from './database'
import { v4 as uuidv4 } from 'uuid'
import { providerManager } from './providers/provider-manager'
import { ChatStorage } from './utils/chat-storage'
import path from 'path'
import fs from 'fs'

export function setupIPC() {
  // File Download/Save As
  ipcMain.handle('download-file', async (_, { url, filename }) => {
    // 1. 获取物理路径
    let filePath = ''
    if (url.startsWith('chat-file://')) {
      const u = new URL(url)
      const sessionId = u.host
      const name = decodeURIComponent(u.pathname.slice(1))
      filePath = path.join(app.getPath('userData'), 'storage', 'chats', sessionId, name)
    }

    if (!filePath || !fs.existsSync(filePath)) {
      return { success: false, error: 'File not found' }
    }

    // 2. 弹出保存对话框
    const { filePath: savePath } = await dialog.showSaveDialog({
      defaultPath: filename || path.basename(filePath),
      filters: [
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }
      ]
    })

    if (!savePath) return { success: false }

    // 3. 复制文件到目标位置
    try {
      fs.copyFileSync(filePath, savePath)
      return { success: true, path: savePath }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // Image Storage
  ipcMain.handle('save-image', async (_, { base64, mimeType, sessionId }) => {
    const filename = `${uuidv4()}.${mimeType.split('/')[1] || 'png'}`
    const dir = path.join(app.getPath('userData'), 'images', sessionId)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    const filePath = path.join(dir, filename)
    const buffer = Buffer.from(base64, 'base64')
    fs.writeFileSync(filePath, buffer)
    return filename
  })

  ipcMain.handle('get-image', async (_, sessionId, filename) => {
    const filePath = path.join(app.getPath('userData'), 'images', sessionId, filename)
    if (!fs.existsSync(filePath)) return null
    const buffer = fs.readFileSync(filePath)
    const ext = path.extname(filename).replace('.', '')
    const mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`
    return `data:${mimeType};base64,${buffer.toString('base64')}`
  })

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

  ipcMain.handle('generate-title', async (_, { providerId, config, message }) => {
    const provider = providerManager.getProvider(providerId)
    if (!provider || !provider.generateTitle) {
      return 'New Chat'
    }
    return provider.generateTitle({ config, message })
  })

  ipcMain.handle('delete-session', async (_, sessionId: string) => {
    // 1. 删除数据库记录
    const stmt = db.prepare('DELETE FROM sessions WHERE id = ?')
    stmt.run(sessionId)

    // 2. 删除关联的磁盘文件
    await ChatStorage.deleteSessionStorage(sessionId)
  })

  ipcMain.handle('delete-last-message', (_, sessionId: string) => {
    const stmt = db.prepare('DELETE FROM messages WHERE id = (SELECT id FROM messages WHERE session_id = ? ORDER BY created_at DESC LIMIT 1)')
    stmt.run(sessionId)
  })

  // Messages
  ipcMain.handle('get-messages', (_, sessionId: string) => {
    const stmt = db.prepare('SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC')
    return stmt.all(sessionId)
  })

  ipcMain.handle('save-message', (_, { sessionId, role, content, type = 'text', attachments = null, modelId, agentId, parts, tokensUsed, cost, isSummary = false }) => {
    const id = uuidv4()
    const stmt = db.prepare(`
      INSERT INTO messages (id, session_id, role, content, type, attachments, model_id, agent_id, parts, tokens_used, cost, is_summary, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const attachmentsStr = attachments ? JSON.stringify(attachments) : null
    const partsStr = parts ? JSON.stringify(parts) : null
    stmt.run(id, sessionId, role, content, type, attachmentsStr, modelId, agentId, partsStr, tokensUsed, cost, isSummary ? 1 : 0, Date.now())
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

  // API Configs
  ipcMain.handle('get-api-config', (_, provider: string) => {
    const stmt = db.prepare('SELECT * FROM api_configs WHERE provider = ?')
    return stmt.get(provider)
  })

  ipcMain.handle('save-api-config', (_, { provider, apiKey, baseUrl }) => {
    const now = Date.now()
    const existing = db.prepare('SELECT id FROM api_configs WHERE provider = ?').get(provider) as { id: string } | undefined
    
    if (existing) {
      const stmt = db.prepare('UPDATE api_configs SET api_key = ?, base_url = ?, updated_at = ? WHERE provider = ?')
      stmt.run(apiKey, baseUrl, now, provider)
      return existing.id
    } else {
      const stmt = db.prepare(`
        INSERT INTO api_configs (id, provider, api_key, base_url, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      const id = `api_${provider}_${Date.now()}`
      stmt.run(id, provider, apiKey, baseUrl, now, now)
      return id
    }
  })

  ipcMain.handle('delete-api-config', (_, provider: string) => {
    const stmt = db.prepare('DELETE FROM api_configs WHERE provider = ?')
    stmt.run(provider)
  })

  // Models
  ipcMain.handle('get-models', (_, provider?: string) => {
    let rows
    if (provider) {
      const stmt = db.prepare('SELECT * FROM models WHERE provider = ? AND is_enabled =1')
      rows = stmt.all(provider)
    } else {
      const stmt = db.prepare('SELECT * FROM models WHERE is_enabled =1')
      rows = stmt.all()
    }
    
    return rows.map((row: any) => ({
      id: row.id,
      provider: row.provider,
      modelId: row.model_id,
      name: row.name,
      capabilities: JSON.parse(row.capabilities),
      contextWindow: row.context_window,
      inputCost: row.input_cost,
      outputCost: row.output_cost,
      isEnabled: row.is_enabled === 1
    }))
  })

  ipcMain.handle('get-model', (_, modelId: string) => {
    const stmt = db.prepare('SELECT * FROM models WHERE model_id = ?')
    const row = stmt.get(modelId) as any
    if (!row) return null
    
    return {
      id: row.id,
      provider: row.provider,
      modelId: row.model_id,
      name: row.name,
      capabilities: JSON.parse(row.capabilities),
      contextWindow: row.context_window,
      inputCost: row.input_cost,
      outputCost: row.output_cost,
      isEnabled: row.is_enabled === 1
    }
  })

  ipcMain.handle('update-model-status', (_, { modelId, isEnabled }) => {
    const stmt = db.prepare('UPDATE models SET is_enabled = ? WHERE model_id = ?')
    stmt.run(isEnabled ? 1 : 0, modelId)
  })
}
