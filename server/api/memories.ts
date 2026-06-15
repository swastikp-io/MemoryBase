import express from 'express';
import { MemoryService } from '../services/memoryService.ts';
import { EpisodeRepository } from '../repositories/episodeRepository.ts';
import { ReflectionEngine } from '../services/memory/reflectionEngine.ts';

export const memoriesRouter = express.Router();
const memoryService = new MemoryService();
const episodeRepo = new EpisodeRepository();
const reflectionEngine = new ReflectionEngine();

memoriesRouter.get('/', (req: any, res) => {
  const userId = req.user.id;
  try {
    const memories = memoryService.getUserMemories(userId);
    res.json(memories);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

memoriesRouter.post('/', async (req: any, res) => {
  const userId = req.user.id;
  const { content, category, importance } = req.body;
  
  try {
    const memory = await memoryService.createMemory(userId, content, category, importance);
    res.status(201).json(memory);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

memoriesRouter.patch('/:id', (req: any, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { content, category, importance } = req.body;

  try {
    const memory = memoryService.updateMemoryForUser(userId, id, { content, category, importance });
    res.json(memory);
  } catch (error: any) {
    if (error.message === 'Memory not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message === 'Forbidden') {
      return res.status(403).json({ error: error.message });
    }
    res.status(400).json({ error: error.message });
  }
});

memoriesRouter.delete('/:id', (req: any, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    memoryService.deleteMemoryForUser(userId, id);
    res.json({ success: true });
  } catch (error: any) {
    if (error.message === 'Memory not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message === 'Forbidden') {
      return res.status(403).json({ error: error.message });
    }
    res.status(400).json({ error: error.message });
  }
});

// Admin/Debug Endpoints
memoriesRouter.get('/debug', (req: any, res) => {
  const userId = req.user.id;
  try {
    const memories = memoryService.getUserMemories(userId);
    res.json({
      totalMemories: memories.length,
      memories
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

memoriesRouter.get('/episodes', (req: any, res) => {
  const userId = req.user.id;
  try {
    const episodes = episodeRepo.findByUserId(userId);
    res.json({
      totalEpisodes: episodes.length,
      episodes
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

memoriesRouter.post('/reflection/run', async (req: any, res) => {
  const userId = req.user.id;
  try {
    await reflectionEngine.runReflection(userId);
    res.json({ success: true, message: 'Reflection complete' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
