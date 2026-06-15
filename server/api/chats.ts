import express from 'express';
import db from '../db/database.ts';
import crypto from 'crypto';

export const chatsRouter = express.Router();

// GET /api/chats
chatsRouter.get('/', (req: any, res) => {
  const userId = req.user.id;
  try {
    const chats = db.prepare(`SELECT id, title, model_name as mode, updated_at as updatedAt FROM chats WHERE user_id = ? ORDER BY updated_at DESC`).all(userId);
    res.json(chats);
  } catch (error) {
    console.error('Error fetching chats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/chats
chatsRouter.post('/', (req: any, res) => {
  const userId = req.user.id;
  const { title, model } = req.body;

  const id = crypto.randomUUID();
  try {
    db.prepare(`INSERT INTO chats (id, user_id, title, model_name) VALUES (?, ?, ?, ?)`).run(id, userId, title || 'New Chat', model);
    res.json({ chatId: id });
  } catch (error) {
    console.error('Error creating chat:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/chats/:chatId/messages
chatsRouter.get('/:chatId/messages', (req: any, res) => {
  const { chatId } = req.params;
  const userId = req.user.id;
  
  try {
    const chat = db.prepare('SELECT user_id FROM chats WHERE id = ?').get(chatId) as any;
    if (!chat || chat.user_id !== userId) return res.status(403).json({ error: 'Forbidden' });

    const messages = db.prepare(`SELECT id, role, content, web_search_used as webSearchUsed, created_at as createdAt FROM messages WHERE chat_id = ? ORDER BY created_at ASC`).all(chatId);
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/chats/:chatId
chatsRouter.patch('/:chatId', (req: any, res) => {
  const { chatId } = req.params;
  const { title, mode } = req.body;
  const userId = req.user.id;

  if (!title && !mode) return res.status(400).json({ error: 'title or mode is required' });

  try {
    const chat = db.prepare('SELECT user_id FROM chats WHERE id = ?').get(chatId) as any;
    if (!chat || chat.user_id !== userId) return res.status(403).json({ error: 'Forbidden' });

    if (title) {
      db.prepare(`UPDATE chats SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(title, chatId);
    }
    if (mode) {
      // In db, it might be stored in model_name or another column? Let's check db schema.
      // Wait, earlier I saw db.prepare(`INSERT INTO chats ... model_name) VALUES (..., model)`).
      // So model_name is the mode/model.
      db.prepare(`UPDATE chats SET model_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(mode, chatId);
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error renaming chat:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/chats/:chatId
chatsRouter.delete('/:chatId', (req: any, res) => {
  const { chatId } = req.params;
  const userId = req.user.id;

  try {
    const chat = db.prepare('SELECT user_id FROM chats WHERE id = ?').get(chatId) as any;
    if (!chat || chat.user_id !== userId) return res.status(403).json({ error: 'Forbidden' });

    db.transaction(() => {
      db.prepare(`DELETE FROM messages WHERE chat_id = ?`).run(chatId);
      db.prepare(`DELETE FROM chats WHERE id = ?`).run(chatId);
    })();
    
    console.log(JSON.stringify({
      event: 'chat_deleted',
      userId,
      chatId,
      deletedAt: new Date().toISOString()
    }));

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting chat:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export const messagesRouter = express.Router();

// POST /api/messages
messagesRouter.post('/', (req: any, res) => {
  const { chatId, role, content, webSearchUsed } = req.body;
  const userId = req.user.id;
  
  if (!chatId || !role || !content) return res.status(400).json({ error: 'chatId, role, and content are required' });

  try {
    const chat = db.prepare('SELECT user_id FROM chats WHERE id = ?').get(chatId) as any;
    if (!chat || chat.user_id !== userId) return res.status(403).json({ error: 'Forbidden' });

    const id = crypto.randomUUID();
    db.transaction(() => {
      db.prepare(`INSERT INTO messages (id, chat_id, role, content, web_search_used) VALUES (?, ?, ?, ?, ?)`).run(id, chatId, role, content, webSearchUsed ? 1 : 0);
      db.prepare(`UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(chatId);
    })();
    res.json({ messageId: id });
  } catch (error) {
    console.error('Error saving message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
