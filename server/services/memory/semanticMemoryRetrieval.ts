import { MemoryService } from '../memoryService.ts';
import { EmbeddingService } from './embeddingService.ts';
import { Memory } from '../../types/memory.ts';

const RETRIEVAL_CONFIG = {
  MAX_MEMORIES_IN_CONTEXT: 5,
  SIMILARITY_THRESHOLD: 0.6,
  TOP_K: 5
};

export class SemanticMemoryRetrieval {
  private memoryService: MemoryService;
  private embeddingService: EmbeddingService;

  constructor() {
    this.memoryService = new MemoryService();
    this.embeddingService = new EmbeddingService();
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length || vecA.length === 0) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async retrieveMemories(userId: string, userMessage: string): Promise<Memory[]> {
    const scored = await this.retrieveMemoriesWithScores(userId, userMessage);
    return scored.map(item => item.memory);
  }

  async retrieveMemoriesWithScores(userId: string, userMessage: string): Promise<Array<{ memory: Memory; score: number; similarity: number; source: 'semantic' }>> {
    const allMemories = this.memoryService.getUserMemories(userId);
    if (allMemories.length === 0) return [];

    const queryEmbeddingResult = await this.embeddingService.generateEmbeddingWithStatus(userMessage);
    if (queryEmbeddingResult.status !== 'completed' || !queryEmbeddingResult.embedding) {
      return [];
    }

    // Calculate scores
    const now = Date.now();
    
    const scoredMemories = allMemories
      .filter(memory => memory.embedding_status === 'completed' && memory.embedding && memory.embedding.length > 0)
      .map(memory => {
      let similarity = 0;
      if (memory.embedding && memory.embedding.length > 0) {
        similarity = this.cosineSimilarity(queryEmbeddingResult.embedding!, memory.embedding);
      }

      // Recency: 0.0 to 1.0 (decay over time, e.g., 30 days half-life)
      // For simplicity, just rank them relative to each other or use an inverse decay.
      // Let's use linear decay over 30 days (2592000000 ms)
      const memoryTime = new Date(memory.created_at).getTime();
      const ageMs = now - memoryTime;
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      let recency = 1.0 - (ageMs / thirtyDays);
      if (recency < 0) recency = 0; // Floor at 0

      const score = (similarity * 0.7) + (memory.importance * 0.2) + (recency * 0.1);

      return { memory, score, similarity, source: 'semantic' as const };
    });

    // Filter by similarity threshold
    const filtered = scoredMemories.filter(m => m.similarity >= RETRIEVAL_CONFIG.SIMILARITY_THRESHOLD);

    // Sort by final score and take Top K
    return filtered
      .sort((a, b) => b.score - a.score)
      .slice(0, RETRIEVAL_CONFIG.TOP_K);
  }
}
