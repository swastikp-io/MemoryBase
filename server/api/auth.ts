import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../db/database.ts';
import crypto from 'crypto';

export const authRouter = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'memorybase-super-secret-key-change-in-prod';

authRouter.post('/register', async (req, res) => {
  const { fullName, email, password } = req.body;
  if (!fullName || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  try {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(400).json({ error: 'Email already in use.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = crypto.randomUUID();

    db.prepare('INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)').run(id, fullName, email, passwordHash);

    const token = jwt.sign({ id, email, name: fullName }, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
    res.json({ success: true, user: { id, fullName, email }, token });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  try {
    const user = db.prepare('SELECT id, name, email, password_hash FROM users WHERE email = ?').get(email) as any;
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (!user.password_hash) {
      // Legacy user without password
      return res.status(401).json({ error: 'Please register again to set a password.' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
    res.json({ success: true, user: { id: user.id, fullName: user.name, email: user.email }, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

authRouter.get('/me', (req: any, res) => {
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(decoded.id) as any;
    if (!user) return res.status(401).json({ error: 'User not found' });
    res.json({ user: { id: user.id, fullName: user.name, email: user.email } });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

authRouter.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});
