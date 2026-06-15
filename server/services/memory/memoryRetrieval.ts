import { MemoryService } from '../memoryService.ts';
import { Memory } from '../../types/memory.ts';

export class MemoryRetrieval {
  private memoryService: MemoryService;

  constructor() {
    this.memoryService = new MemoryService();
  }

  retrieveMemories(userId: string, userMessage: string, topK: number = 5): Memory[] {
    const allMemories = this.memoryService.getUserMemories(userId);
    if (allMemories.length === 0) return [];

    const query = userMessage.toLowerCase();
    
    // Simple keyword extraction from query
    const words = query.split(/\W+/).filter(w => w.length > 3);
    
    // Identify potential categories mentioned
    const categoryKeywords: Record<string, string[]> = {
      identity: ['i am', 'my name', 'call me', 'who am i', 'my age'],
      preference: ['prefer', 'like', 'dislike', 'love', 'hate', 'always', 'never', 'theme', 'color'],
      skill: ['know', 'fluent', 'can code', 'expert', 'proficient', 'experience'],
      goal: ['want to', 'planning to', 'goal', 'achieve', 'building'],
      work: ['job', 'company', 'project', 'work', 'boss', 'team']
    };

    const activeCategories = new Set<string>();
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(k => query.includes(k))) {
        activeCategories.add(category);
      }
    }

    const scoredMemories = allMemories.map(memory => {
      let score = 0;
      const memContent = memory.content.toLowerCase();
      
      // Keyword matching
      for (const word of words) {
        if (memContent.includes(word)) {
          score += 1;
        }
      }

      // Exact phrase match bonus
      if (words.length > 1 && memContent.includes(words.slice(0, 2).join(' '))) {
        score += 2;
      }

      // Category matching bonus
      if (memory.category && activeCategories.has(memory.category)) {
        score += 3;
      }

      // Importance weight
      score *= memory.importance;

      return { memory, score };
    });

    // Sort by score descending and take topK
    const topMemories = scoredMemories
      .filter(m => m.score > 0 || m.memory.importance >= 0.9) // Return at least highly important ones
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(m => m.memory);

    return topMemories;
  }
}
