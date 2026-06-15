import { EpisodeRepository } from '../../repositories/episodeRepository.ts';
import { EmbeddingService } from './embeddingService.ts';
import { Episode } from '../../types/memory.ts';

const EPISODE_RETRIEVAL_CONFIG = {
  SIMILARITY_THRESHOLD: 0.5,
  TOP_K: 3
};

export class EpisodeRetrieval {
  private episodeRepository: EpisodeRepository;
  private embeddingService: EmbeddingService;

  constructor() {
    this.episodeRepository = new EpisodeRepository();
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

  async retrieveEpisodes(userId: string, userMessage: string): Promise<Episode[]> {
    const allEpisodes = this.episodeRepository.findByUserId(userId);
    if (allEpisodes.length === 0) return [];

    const queryEmbedding = await this.embeddingService.generateEmbedding(userMessage);

    const scoredEpisodes = allEpisodes.map(episode => {
      let similarity = 0;
      if (episode.embedding && episode.embedding.length > 0) {
        similarity = this.cosineSimilarity(queryEmbedding, episode.embedding);
      }
      return { episode, similarity };
    });

    const filtered = scoredEpisodes.filter(e => e.similarity >= EPISODE_RETRIEVAL_CONFIG.SIMILARITY_THRESHOLD);

    const topEpisodes = filtered
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, EPISODE_RETRIEVAL_CONFIG.TOP_K)
      .map(e => e.episode);

    return topEpisodes;
  }
}
