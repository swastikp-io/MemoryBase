import { MemoryService } from '../memoryService.ts';
import { Memory } from '../../types/memory.ts';

export class MemoryConsolidation {
  private memoryService: MemoryService;

  constructor() {
    this.memoryService = new MemoryService();
  }

  async create(userId: string, content: string, category?: string, importance?: number): Promise<Memory | null> {
    return this.memoryService.createMemory(userId, content, category, importance);
  }

  async update(memoryId: string, updates: { content?: string; category?: string; importance?: number }): Promise<Memory> {
    return this.memoryService.updateMemory(memoryId, updates);
  }

  async delete(memoryId: string): Promise<boolean> {
    return this.memoryService.deleteMemory(memoryId);
  }

  async merge(userId: string, sourceIds: string[], mergedContent: string, newCategory?: string): Promise<Memory | null> {
    if (sourceIds.length < 2) {
      throw new Error('Need at least two memories to merge');
    }

    let highestImportance = 0.5;
    
    // First read all sources to find highest importance
    for (const id of sourceIds) {
      const mem = this.memoryService.getMemoryById(id);
      if (mem && mem.importance > highestImportance) {
        highestImportance = mem.importance;
      }
    }

    // Create the new merged memory
    const newMemory = await this.memoryService.createMemory(userId, mergedContent, newCategory, highestImportance);

    if (newMemory) {
      // If successful, delete the old ones
      for (const id of sourceIds) {
        this.memoryService.deleteMemory(id);
      }
    }

    return newMemory;
  }
}
