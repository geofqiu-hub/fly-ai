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

export default db
