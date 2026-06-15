const fs = require('fs');
const file = 'paralex.db';

if (fs.existsSync(file)) {
  const sqlite3 = require('better-sqlite3');
  const db = new sqlite3(file);
  const tables = ['memories', 'chat_memory', 'episodes'];
  tables.forEach(t => {
    try {
      const row = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='${t}'`).get();
      if (row) {
        console.log(`Schema for ${t}:`);
        console.log(row.sql);
        console.log('---');
      }
    } catch(e) {}
  });
}
