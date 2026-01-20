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

  // Agents
  ipcMain.handle('get-agents', () => {
    console.log('🤖 IPC: Get all agents')
    const stmt = db.prepare('SELECT * FROM agents ORDER BY created_at DESC')
    const agents = stmt.all()
    console.log(`✅ IPC: Retrieved ${agents.length} agents`)
    return agents
  })

  ipcMain.handle('get-agent', (_, agentId: string) => {
    console.log('🤖 IPC: Get agent -', agentId)
    const stmt = db.prepare('SELECT * FROM agents WHERE id = ?')
    const agent = stmt.get(agentId)
    return agent
  })

  ipcMain.handle('save-agent', (_, { id, name, description, systemPrompt, avatarColor, modelId, temperature, isPreset = false }) => {
    const agentId = id || uuidv4()
    const now = Date.now()
    console.log(`🤖 IPC: Save agent - ${name} (${agentId})`)

    if (id) {
      // Update existing agent
      const stmt = db.prepare('UPDATE agents SET name = ?, description = ?, system_prompt = ?, avatar_color = ?, model_id = ?, temperature = ?, updated_at = ? WHERE id = ?')
      stmt.run(name, description, systemPrompt, avatarColor, modelId, temperature, now, id)
    } else {
      // Create new agent
      const stmt = db.prepare('INSERT INTO agents (id, name, description, system_prompt, avatar_color, model_id, temperature, is_preset, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      stmt.run(agentId, name, description, systemPrompt, avatarColor, modelId, temperature, isPreset ? 1 : 0, now, now)
    }

    console.log('✅ IPC: Agent saved -', agentId)
    return agentId
  })

  ipcMain.handle('delete-agent', (_, agentId: string) => {
    console.log('🗑️ IPC: Delete agent -', agentId)
    const stmt = db.prepare('DELETE FROM agents WHERE id = ? AND is_preset = 0')
    const result = stmt.run(agentId)
    if (result.changes === 0) {
      console.log('⚠️ IPC: Cannot delete preset agent or agent not found')
      return false
    }
    console.log('✅ IPC: Agent deleted')
    return true
  })

  // Preset Agents
  const PRESET_AGENTS = [
    {
      id: 'preset-matting',
      name: '抠图大师',
      description: 'PS资深使用者，擅长写实风格图像抠图与合成',
      systemPrompt: `# Gemini Strict Confirmation Mode - Subject Replacement Prompt (English 2026 Best Practice)

You are an extremely cautious professional commercial photography retouching assistant.
**Core rule: When I upload multiple images, NEVER start any editing or generation immediately! You MUST follow the confirmation process first.**

## Mandatory steps upon receiving images (follow in exact order):

1. **Observe and describe**
   Look at all images I just uploaded (currently two).
   Clearly list in Chinese:
   - Total number of images received
   - Short objective description of each (e.g., "Image 1: empty living room scene with a white sofa in center" "Image 2: close-up of a red single chair")

2. **Actively ask for confirmation** (must use these exact sentences):
   Please clearly tell me:
   - Which one is the **Template / Scene Image**? (the one whose background, lighting, environment, tone, perspective must be 100% preserved, original subject will be removed)
   - Which one is the **Material / Subject Image**? (the one whose main object you want to transplant completely into the template, keeping all original color, texture, lighting details)

3. **Wait for my answer**
   Do NOT proceed with any image generation, editing, replacement, or assumption until I explicitly specify which is which.

Only AFTER I clearly answer, proceed with the strict replacement rules below:

## Iron Rules for Replacement (use only after role confirmation)

- Replace **ONLY** the main subject object.
- **Absolutely preserve 100%** of the scene: background, lighting direction & intensity, all shadows, ground texture, props, overall color tone, white balance, mood, perspective, lens characteristics, aspect ratio, depth of field — **ZERO** change allowed to anything else.
- Keep **100%** of the original photographic realism from the subject image: exact colors, materials, textures, wear, wrinkles, highlights, reflections, shadow structure — **NO** cartoon, anime, 3D render, painting, toy look.
- Match angle, perspective, size, contact with environment **exactly** to the original position in template.
- Blend edges, lighting, reflections, shadows **perfectly** — result must look like one single real photo taken by the same camera at the same moment.
- **Never** alter overall color temperature, contrast, saturation, brightness, or add/remove/move any non-subject element.

**Final task** (execute only after confirmation):
Transplant the subject from the Material Image precisely and seamlessly into the corresponding position in the Template Image. Output one single, perfectly realistic commercial photograph.

**Strong negative prompt**:
no cartoon, no anime, no illustration, no 3D render, no CGI, no plastic look, no toy look, no different lighting, no color shift, no filter, no Instagram style, no visible seams, no edge halo, no layering, no deformation, no extra objects, no watermark, no text, no logo, no overexposure, no underexposure

Please **immediately start step 1 and step 2** now — do not skip!`,
      avatarColor: '#ef4444',
      modelId: 'gemini-2.0-flash-exp',
      temperature: 0.5
    },
    {
      id: 'preset-coding',
      name: '编程助手',
      description: '专注于编程、代码审查和问题解决',
      systemPrompt: '你是一个专业的编程助手。擅长多种编程语言，能够帮助用户编写、审查和优化代码。回答时注重代码质量和最佳实践。',
      avatarColor: '#3b82f6',
      modelId: 'gemini-2.0-flash-exp',
      temperature: 0.3
    },
    {
      id: 'preset-writing',
      name: '写作助手',
      description: '帮助写作、编辑和改进文本内容',
      systemPrompt: '你是一个专业的写作助手。擅长帮助用户撰写和编辑各种类型的文本，包括文章、邮件、报告等。注重表达的清晰性和流畅性。',
      avatarColor: '#10b981',
      modelId: 'gemini-2.0-flash-exp',
      temperature: 0.8
    },
    {
      id: 'preset-analyzer',
      name: '数据分析',
      description: '协助进行数据分析和可视化',
      systemPrompt: '你是一个数据分析专家。擅长解读数据、创建分析报告和提供数据驱动的见解。能够帮助用户理解复杂的数据模式。',
      avatarColor: '#f59e0b',
      modelId: 'gemini-2.0-flash-exp',
      temperature: 0.5
    },
    {
      id: 'preset-creative',
      name: '创意助手',
      description: '激发创意、头脑风暴和内容创作',
      systemPrompt: '你是一个创意助手。擅长头脑风暴、创意生成和内容创作。能够帮助用户突破思维定式，产生新颖的想法。',
      avatarColor: '#ec4899',
      modelId: 'gemini-2.0-flash-exp',
      temperature: 0.9
    },
    {
      id: 'preset-teacher',
      name: '学习导师',
      description: '解释概念、帮助学习和理解',
      systemPrompt: '你是一个耐心的学习导师。擅长用简单易懂的方式解释复杂概念。能够根据学生的水平调整解释方式，鼓励提问和探索。',
      avatarColor: '#8b5cf6',
      modelId: 'gemini-2.0-flash-exp',
      temperature: 0.6
    }
  ]

  ipcMain.handle('get-preset-agents', () => {
    console.log('🎯 IPC: Get preset agents')
    // Transform camelCase to snake_case to match database schema
    return PRESET_AGENTS.map(preset => ({
      id: preset.id,
      name: preset.name,
      description: preset.description,
      system_prompt: preset.systemPrompt,
      avatar_color: preset.avatarColor,
      model_id: preset.modelId,
      temperature: preset.temperature
    }))
  })

  ipcMain.handle('create-agent-from-preset', (_, presetId: string) => {
    console.log('📋 IPC: Create agent from preset -', presetId)
    const preset = PRESET_AGENTS.find(p => p.id === presetId)
    if (!preset) {
      console.log('❌ IPC: Preset not found')
      return null
    }

    const newId = uuidv4()
    const now = Date.now()
    const stmt = db.prepare('INSERT INTO agents (id, name, description, system_prompt, avatar_color, model_id, temperature, is_preset, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    stmt.run(newId, preset.name, preset.description, preset.systemPrompt, preset.avatarColor, preset.modelId, preset.temperature, 0, now, now)

    console.log('✅ IPC: Agent created from preset -', newId)
    return newId
  })

  // Session-Agent association
  ipcMain.handle('update-session-agent', (_, { sessionId, agentId }) => {
    console.log('🔗 IPC: Update session agent -', sessionId, '->', agentId || 'none')
    const stmt = db.prepare('UPDATE sessions SET agent_id = ? WHERE id = ?')
    stmt.run(agentId || null, sessionId)
    console.log('✅ IPC: Session agent updated')
  })

  console.log('✅ IPC: All handlers registered')
}