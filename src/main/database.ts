import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'
import fs from 'fs'

const dbPath = path.join(app.getPath('userData'), 'flyai.db')

// Ensure directory exists
const dbDir = path.dirname(dbPath)
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

const db = new Database(dbPath)
db.pragma('foreign_keys = ON')

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    title TEXT,
    created_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    role TEXT,
    content TEXT,
    type TEXT DEFAULT 'text',
    attachments TEXT,
    created_at INTEGER,
    FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
  );
`)

// Migration: Add attachments column if not exists (for existing users)
try {
  db.exec('ALTER TABLE messages ADD COLUMN attachments TEXT')
} catch (error) {
  // Column likely already exists, ignore
}

try {
  db.exec('ALTER TABLE messages ADD COLUMN thought TEXT')
} catch (error) {
  // Column likely already exists, ignore
}

// Migration: Add agents table and session-agent relationship
db.exec(`
  CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    system_prompt TEXT,
    avatar_color TEXT DEFAULT '#7c3aed',
    model_id TEXT,
    temperature REAL DEFAULT 0.7,
    is_preset INTEGER DEFAULT 0,
    created_at INTEGER,
    updated_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS preset_agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    system_prompt TEXT,
    avatar_color TEXT DEFAULT '#7c3aed',
    model_id TEXT,
    temperature REAL DEFAULT 0.7
  );
`)

// Migration: Add agent_id column to sessions
try {
  db.exec('ALTER TABLE sessions ADD COLUMN agent_id TEXT')
} catch (error) {
  // Column likely already exists, ignore
}

// Migration: Add model_type column to sessions
try {
  db.exec('ALTER TABLE sessions ADD COLUMN model_type TEXT DEFAULT "text"')
} catch (error) {
  // Column likely already exists, ignore
}

// Phase 2: API 配置表
db.exec(`
  CREATE TABLE IF NOT EXISTS api_configs (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    api_key TEXT NOT NULL,
    base_url TEXT,
    created_at INTEGER,
    updated_at INTEGER
  );
`)

// Phase 2: 模型配置表
db.exec(`
  CREATE TABLE IF NOT EXISTS models (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    model_id TEXT NOT NULL,
    name TEXT NOT NULL,
    capabilities TEXT,
    context_window INTEGER,
    input_cost REAL,
    output_cost REAL,
    is_enabled INTEGER DEFAULT 1
  );
`)

// Phase 2: 扩展 messages 表支持多模态和压缩
try {
  db.exec('ALTER TABLE messages ADD COLUMN parts TEXT')
} catch (error) {
  // Column likely already exists, ignore
}

try {
  db.exec('ALTER TABLE messages ADD COLUMN model_id TEXT')
} catch (error) {
  // Column likely already exists, ignore
}

try {
  db.exec('ALTER TABLE messages ADD COLUMN agent_id TEXT')
} catch (error) {
  // Column likely already exists, ignore
}

try {
  db.exec('ALTER TABLE messages ADD COLUMN tokens_used INTEGER')
} catch (error) {
  // Column likely already exists, ignore
}

try {
  db.exec('ALTER TABLE messages ADD COLUMN cost REAL')
} catch (error) {
  // Column likely already exists, ignore
}

try {
  db.exec('ALTER TABLE messages ADD COLUMN is_summary INTEGER DEFAULT 0')
} catch (error) {
  // Column likely already exists, ignore
}

// Phase 2: 消息 Parts 表
db.exec(`
  CREATE TABLE IF NOT EXISTS message_parts (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL,
    part_type TEXT NOT NULL,
    content TEXT,
    metadata TEXT,
    created_at INTEGER,
    FOREIGN KEY(message_id) REFERENCES messages(id) ON DELETE CASCADE
  );
`)

// Phase 5: 压缩记录表
db.exec(`
  CREATE TABLE IF NOT EXISTS compactions (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    original_message_count INTEGER,
    original_token_count INTEGER,
    compacted_token_count INTEGER,
    model TEXT,
    is_auto INTEGER DEFAULT 0,
    created_at INTEGER,
    FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
  );
`)

// Phase 2/3: 扩展 sessions 表
try {
  db.exec('ALTER TABLE sessions ADD COLUMN parent_session_id TEXT')
} catch (error) {
  // Column likely already exists, ignore
}

try {
  db.exec('ALTER TABLE sessions ADD COLUMN fork_id TEXT')
} catch (error) {
  // Column likely already exists, ignore
}

try {
  db.exec('ALTER TABLE sessions ADD COLUMN fork_timestamp INTEGER')
} catch (error) {
  // Column likely already exists, ignore
}

try {
  db.exec('ALTER TABLE sessions ADD COLUMN last_compaction_time INTEGER')
} catch (error) {
  // Column likely already exists, ignore
}

try {
  db.exec('ALTER TABLE sessions ADD COLUMN compaction_count INTEGER DEFAULT 0')
} catch (error) {
  // Column likely already exists, ignore
}

// Phase 7: 知识库预留表
db.exec(`
  CREATE TABLE IF NOT EXISTS knowledge_bases (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    embedding_model TEXT,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER,
    updated_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS knowledge_documents (
    id TEXT PRIMARY KEY,
    kb_id TEXT NOT NULL,
    title TEXT,
    content TEXT NOT NULL,
    file_path TEXT,
    metadata TEXT,
    created_at INTEGER,
    FOREIGN KEY(kb_id) REFERENCES knowledge_bases(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS knowledge_chunks (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding BLOB,
    created_at INTEGER,
    FOREIGN KEY(document_id) REFERENCES knowledge_documents(id) ON DELETE CASCADE
  );
`)

// Phase 8: 云端同步预留表
db.exec(`
  CREATE TABLE IF NOT EXISTS sync_state (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    last_sync_at INTEGER,
    sync_status TEXT DEFAULT 'idle',
    pending_operations TEXT,
    conflict_count INTEGER DEFAULT 0,
    created_at INTEGER,
    updated_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS sync_operations (
    id TEXT PRIMARY KEY,
    operation_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    data TEXT,
    status TEXT DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    created_at INTEGER,
    synced_at INTEGER
  );
`)

// Initialize default models
const initModels = () => {
  const models = [
    ['gemini-3-flash-preview', 'gemini', 'gemini-3-flash-preview', '快速', JSON.stringify({ text: true, image: true, tools: true }), 1000000, 0.0000001, 0.0000001, 1],
    ['gemini-3-pro-preview', 'gemini', 'gemini-3-pro-preview', 'Pro', JSON.stringify({ text: true, image: true, tools: true }), 2000000, 0.000001, 0.000001, 1],
    ['gemini-3-pro-image-preview', 'gemini', 'gemini-3-pro-image-preview', '图片', JSON.stringify({ text: true, image: true, tools: true }), 2000000, 0.000001, 0.000001, 1],
  ]
  
  const modelIds = models.map(m => m[2])
  
  // Delete models that are not in the predefined list
  const placeholders = modelIds.map(() => '?').join(',')
  db.prepare(`DELETE FROM models WHERE model_id NOT IN (${placeholders})`).run(...modelIds)
  
  const insert = db.prepare('INSERT OR REPLACE INTO models (id, provider, model_id, name, capabilities, context_window, input_cost, output_cost, is_enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
  
  models.forEach(model => {
    try {
      insert.run(...model)
    } catch (error) {
      console.error('Failed to insert model:', model[0], error)
    }
  })
}

initModels()

export default db
