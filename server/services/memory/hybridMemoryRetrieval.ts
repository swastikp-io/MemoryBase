import { Memory } from '../../types/memory.ts';
import { MemoryService } from '../memoryService.ts';
import { SemanticMemoryRetrieval } from './semanticMemoryRetrieval.ts';

export interface MemoryRetrievalResult {
  memory: Memory;
  score: number;
  source: 'semantic' | 'keyword' | 'recent';
  similarity?: number;
}

const DEFAULT_TOP_K = 5;

export class HybridMemoryRetrieval {
  private memoryService: MemoryService;
  private semanticRetrieval: SemanticMemoryRetrieval;

  constructor() {
    this.memoryService = new MemoryService();
    this.semanticRetrieval = new SemanticMemoryRetrieval();
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 2);
  }

  private keywordSearch(userId: string, userMessage: string, topK: number): MemoryRetrievalResult[] {
    const memories = this.memoryService.getUserMemories(userId);
    const queryWords = this.tokenize(userMessage);
    if (memories.length === 0 || queryWords.length === 0) return [];

    const slotBoosts: Record<string, string[]> = {
      language: ['language', 'programming', 'typescript', 'python', 'rust', 'prefer'],
      startup: ['startup', 'company', 'business', 'called'],
      location: ['live', 'location', 'based', 'where'],
      preference: ['prefer', 'favorite', 'like', 'enjoy'],
      project: ['building', 'project', 'assistant', 'product'],
    };

    const scored = memories.map(memory => {
      const content = memory.content.toLowerCase();
      let score = 0;

      for (const word of queryWords) {
        if (content.includes(word)) score += 1;
      }

      for (const [slot, words] of Object.entries(slotBoosts)) {
        const queryMatchesSlot = words.some(word => queryWords.includes(word));
        const memoryMatchesSlot = words.some(word => content.includes(word));
        if (queryMatchesSlot && memoryMatchesSlot) score += 2;
        if (slot === 'preference' && queryMatchesSlot && memory.category === 'preference') score += 1.5;
      }

      score *= memory.importance || 0.5;
      return { memory, score, source: 'keyword' as const };
    });

    return scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  private recentMemories(userId: string, topK: number): MemoryRetrievalResult[] {
    return this.memoryService
      .getUserMemories(userId)
      .slice(0, topK)
      .map((memory, index) => ({
        memory,
        score: Math.max(0.1, (topK - index) / topK) * (memory.importance || 0.5),
        source: 'recent' as const,
      }));
  }

  async retrieve(userId: string, userMessage: string, topK: number = DEFAULT_TOP_K): Promise<MemoryRetrievalResult[]> {
    const allMemories = this.memoryService.getUserMemories(userId);
    if (allMemories.length === 0) return [];

    const semanticResults = await this.semanticRetrieval.retrieveMemoriesWithScores(userId, userMessage);
    if (semanticResults.length > 0) {
      return semanticResults.slice(0, topK);
    }

    const keywordResults = this.keywordSearch(userId, userMessage, topK);
    if (keywordResults.length > 0) {
      return keywordResults;
    }

    return this.recentMemories(userId, topK);
  }
}
