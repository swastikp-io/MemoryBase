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

    CREATE TABLE IF NOT EXISTS chat_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT,
        mode TEXT DEFAULT 'standard',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  try {
    db.prepare('ALTER TABLE messages ADD COLUMN web_search_used BOOLEAN DEFAULT 0;').run();
  } catch (e: any) {}

  try {
    db.prepare("ALTER TABLE chat_sessions ADD COLUMN mode TEXT DEFAULT 'standard';").run();
  } catch (e: any) {}
}

initDb();

export default db;
