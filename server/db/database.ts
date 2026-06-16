import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'memorybase.db');
const db = new Database(dbPath);

// Initialize database
export function initDb() {
  // Disable FK enforcement — user IDs now come from Supabase Auth,
  // not a local users table.
  db.pragma('foreign_keys = OFF');

  db.exec(`
    CREATE TABLE IF NOT EXISTS chats (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT DEFAULT 'New Chat',
        model_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        chat_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        web_search_used BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
    CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
    CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON chats(updated_at DESC);

    -- Memory Layer
    CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT,
        importance REAL DEFAULT 0.5,
        embedding TEXT,
        embedding_status TEXT DEFAULT 'pending',
        memory_state TEXT DEFAULT 'active',
        occurrence_count INTEGER DEFAULT 1,
        last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        superseded_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS chat_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT,
        mode TEXT DEFAULT 'standard',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS episodes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        summary TEXT NOT NULL,
        embedding TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories(user_id);
    CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category);
  `);

  // Legacy column migrations for existing databases
  try {
    db.prepare('ALTER TABLE memories ADD COLUMN embedding TEXT;').run();
  } catch (e: any) {}

  try {
    db.prepare('ALTER TABLE messages ADD COLUMN web_search_used BOOLEAN DEFAULT 0;').run();
  } catch (e: any) {}

  const memoryColumnDefaults: Array<{ name: string; sql: string }> = [
    { name: 'embedding_status', sql: "ALTER TABLE memories ADD COLUMN embedding_status TEXT DEFAULT 'pending';" },
    { name: 'memory_state', sql: "ALTER TABLE memories ADD COLUMN memory_state TEXT DEFAULT 'active';" },
    { name: 'occurrence_count', sql: "ALTER TABLE memories ADD COLUMN occurrence_count INTEGER DEFAULT 1;" },
    { name: 'last_seen_at', sql: "ALTER TABLE memories ADD COLUMN last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP;" },
    { name: 'superseded_by', sql: "ALTER TABLE memories ADD COLUMN superseded_by TEXT;" },
  ];

  for (const column of memoryColumnDefaults) {
    try {
      db.prepare(column.sql).run();
    } catch (e: any) {}
  }

  try {
    db.prepare("ALTER TABLE chat_sessions ADD COLUMN mode TEXT DEFAULT 'standard';").run();
  } catch (e: any) {}
}

initDb();

export default db;
