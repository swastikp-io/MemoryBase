import { MemoryRepository } from '../repositories/memoryRepository.ts';
import { Memory } from '../types/memory.ts';
import { EmbeddingService } from './memory/embeddingService.ts';

export class MemoryService {
  private repository: MemoryRepository;
  private embeddingService: EmbeddingService;

  constructor() {
    this.repository = new MemoryRepository();
    this.embeddingService = new EmbeddingService();
  }

  private normalizeContent(content: string): string {
    return content
      .toLowerCase()
      .replace(/^user\s+/, '')
      .replace(/\b(my|user|the|a|an|is|called|named|favorite|preferred)\b/g, ' ')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractMemorySlot(content: string): string | null {
    const text = content.toLowerCase();
    const slots: Array<[string, RegExp]> = [
      ['favorite_language', /\b(favorite|preferred)?\s*(programming\s*)?language\b/],
      ['startup', /\b(startup|company|business)\b/],
      ['location', /\b(live in|lives in|location|based in)\b/],
      ['interface_preference', /\b(dark mode|light mode|interface|theme)\b/],
      ['pet_dog', /\b(dog)\b/],
      ['favorite_number', /\b(favorite|preferred)?\s*number\b/],
    ];

    for (const [slot, pattern] of slots) {
      if (pattern.test(text)) return slot;
    }
    return null;
  }

  private looksLikeDuplicate(a: string, b: string): boolean {
    const normalizedA = this.normalizeContent(a);
    const normalizedB = this.normalizeContent(b);
    if (!normalizedA || !normalizedB) return false;
    if (normalizedA === normalizedB) return true;

    const wordsA = new Set(normalizedA.split(' ').filter(Boolean));
    const wordsB = new Set(normalizedB.split(' ').filter(Boolean));
    const overlap = [...wordsA].filter(word => wordsB.has(word)).length;
    const union = new Set([...wordsA, ...wordsB]).size || 1;
    return overlap / union >= 0.75;
  }

  async createMemory(userId: string, content: string, category?: string, importance: number = 0.5): Promise<Memory | null> {
    if (!content || content.trim() === '') {
      throw new Error('Content is required');
    }

    const activeMemories = this.repository.findActiveByUserId(userId);
    const duplicate = activeMemories.find(memory => this.looksLikeDuplicate(memory.content, content));
    if (duplicate) {
      const updated = this.repository.update(duplicate.id, {
        importance: Math.max(duplicate.importance, importance),
        occurrence_count: (duplicate.occurrence_count || 1) + 1,
        last_seen_at: new Date().toISOString(),
      });
      console.log(`[MemoryService] Duplicate memory merged for user ${userId}: ${content}`);
      return updated || duplicate;
    }

    const slot = this.extractMemorySlot(content);
    
    const embeddingResult = await this.embeddingService.generateEmbeddingWithStatus(content);

    const memory = this.repository.create({
      user_id: userId,
      content,
      category,
      importance,
      embedding: embeddingResult.embedding,
      embedding_status: embeddingResult.status,
      memory_state: 'active',
      occurrence_count: 1
    });

    if (slot) {
      for (const existing of activeMemories) {
        const existingSlot = this.extractMemorySlot(existing.content);
        if (existingSlot === slot && !this.looksLikeDuplicate(existing.content, content)) {
          this.repository.markSuperseded(existing.id, memory.id);
        }
      }
    }

    console.log(`[MemoryService] Memory created for user ${userId}: ${content} [${category}] (Importance: ${importance})`);
    return memory;
  }

  updateMemory(id: string, updates: { content?: string; category?: string; importance?: number; memory_state?: 'active' | 'superseded' | 'deleted' }): Memory {
    if (updates.content !== undefined && updates.content.trim() === '') {
      throw new Error('Content cannot be empty');
    }
    
    const updated = this.repository.update(id, updates);
    if (!updated) {
      throw new Error('Memory not found');
    }
    return updated;
  }

  updateMemoryForUser(userId: string, id: string, updates: { content?: string; category?: string; importance?: number; memory_state?: 'active' | 'superseded' | 'deleted' }): Memory {
    const existing = this.repository.findById(id);
    if (!existing) {
      throw new Error('Memory not found');
    }
    if (existing.user_id !== userId) {
      throw new Error('Forbidden');
    }
    return this.updateMemory(id, updates);
  }

  deleteMemory(id: string): boolean {
    const deleted = this.repository.delete(id);
    if (!deleted) {
      throw new Error('Memory not found');
    }
    return deleted;
  }

  deleteMemoryForUser(userId: string, id: string): boolean {
    const existing = this.repository.findById(id);
    if (!existing) {
      throw new Error('Memory not found');
    }
    if (existing.user_id !== userId) {
      throw new Error('Forbidden');
    }
    return this.deleteMemory(id);
  }

  getUserMemories(userId: string): Memory[] {
    if (!userId) {
      throw new Error('User ID is required');
    }
    return this.repository.findActiveByUserId(userId);
  }

  getAllUserMemories(userId: string): Memory[] {
    if (!userId) {
      throw new Error('User ID is required');
    }
    return this.repository.findByUserId(userId);
  }

  getMemoryById(id: string): Memory {
    const memory = this.repository.findById(id);
    if (!memory) {
      throw new Error('Memory not found');
    }
    return memory;
  }
}
