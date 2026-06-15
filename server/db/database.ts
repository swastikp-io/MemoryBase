import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'memorybase.db');
const db = new Database(dbPath);

// Initialize database
export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS invite_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      invite_code TEXT UNIQUE NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        password_hash TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS chats (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT DEFAULT 'New Chat',
        model_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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

    -- Future tables
    CREATE TABLE IF NOT EXISTS folders (id TEXT PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS attachments (id TEXT PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS workspace_members (id TEXT PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS shared_chats (id TEXT PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS chat_memory (id TEXT PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS agent_runs (id TEXT PRIMARY KEY);

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
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chat_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT,
        mode TEXT DEFAULT 'standard',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS episodes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        summary TEXT NOT NULL,
        embedding TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories(user_id);
    CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category);
  `);

  // Try to add embedding column if it doesn't exist (for existing databases)
  try {
    db.prepare('ALTER TABLE memories ADD COLUMN embedding TEXT;').run();
  } catch (e: any) {}

  try {
    db.prepare('ALTER TABLE users ADD COLUMN password_hash TEXT;').run();
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

  // Seed the table
  const users = [
    { name: 'Anupam Pandey', email: 'anupampandeyunique@gmail.com', code: 'PLX-ANUP-7KQ9' },
    { name: 'Praveer', email: 'praveerkpa@gmail.com', code: 'PLX-PRAV-4MZ2' },
    { name: 'Gaurav Rao', email: 'gauravraorao6@gmail.com', code: 'PLX-GAUR-8XJ5' },
    { name: 'Anuska Srivastava', email: 'anuska.srivastava03@gmail.com', code: 'PLX-ANUS-6RP3' },
    { name: 'Vikas Pratap', email: 'vikaspratap14@gmail.com', code: 'PLX-VIKA-9TD7' },
    { name: 'Shivani Bind', email: 'shivanibind99000@gmail.com', code: 'PLX-SHIV-5YL4' },
    { name: 'Abhimanyu Rastogi', email: 'rastogi.abhimanyu.26@gmail.com', code: 'PLX-ABHI-2NF8' },
    { name: 'Nikhil', email: 'nikhil3nika@gmail.com', code: 'PLX-NIKH-7VC1' },
    { name: 'Jiya Singh', email: 'singhjiya1472@gmail.com', code: 'PLX-JIYA-3QW6' },
    { name: 'Vanshika Malhotra', email: 'malhotravanshika2106@gmail.com', code: 'PLX-VANS-8KP2' },
    { name: 'Rajeev Kumar', email: 'rajeevkumarvns37@gmail.com', code: 'PLX-RAJE-4HG9' },
    { name: 'Jeeval Savant', email: 'Jeevalsavant@gmail.com', code: 'PLX-JEEV-6BM5' },
    { name: 'Abhishek Yadav', email: 'abhishekyadaf@gmail.com', code: 'PLX-ABHY-1XR7' },
    { name: 'Swastik Patel', email: 'dev.swastikpatel0305@gmail.com', code: 'PLX-SWAS-5NJ8' },
  ];

  // Startup validation script
  const emailSet = new Set<string>();
  const codeSet = new Set<string>();
  for (const u of users) {
    if (emailSet.has(u.email)) {
      console.warn(`[WARNING] Duplicate email found in seed configuration: ${u.email}`);
    }
    emailSet.add(u.email);

    if (codeSet.has(u.code)) {
      console.warn(`[WARNING] Duplicate invite code found in seed configuration: ${u.code}`);
    }
    codeSet.add(u.code);
  }

  const upsert = db.prepare(`
    INSERT INTO invite_users (full_name, email, invite_code) 
    VALUES (?, ?, ?) 
    ON CONFLICT(email) DO UPDATE SET 
      invite_code = excluded.invite_code,
      is_active = 1
  `);
  
  const insertMany = db.transaction((usersToInsert: any[]) => {
    for (const user of usersToInsert) {
      try {
        upsert.run(user.name, user.email, user.code);
      } catch (err: any) {
        console.error(`[ERROR] Failed to upsert user ${user.email}:`, err.message);
      }
    }
  });
  
  insertMany(users);
}

initDb();

export default db;
