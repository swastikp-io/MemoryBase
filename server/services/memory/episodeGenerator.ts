import OpenAI from 'openai';
import { EpisodeRepository } from '../../repositories/episodeRepository.ts';
import { EmbeddingService } from './embeddingService.ts';
import { Episode } from '../../types/memory.ts';

export class EpisodeGenerator {
  private episodeRepository: EpisodeRepository;
  private embeddingService: EmbeddingService;

  constructor() {
    this.episodeRepository = new EpisodeRepository();
    this.embeddingService = new EmbeddingService();
  }

  async generateAndSaveEpisode(
    openai: OpenAI,
    userId: string,
    messages: Array<{ role: string; content: string }>
  ): Promise<Episode | null> {
    try {
      const conversationText = messages
        .map(m => {
          const contentStr = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
          return `${m.role.toUpperCase()}: ${contentStr}`;
        })
        .join('\n');

      const systemPrompt = `You are an AI assistant that summarizes conversation episodes into a single concise sentence.
Write in the third-person about the user.
Example: "User discussed implementing memory architecture for MemoryBase using pgvector."
Focus on the main topic and outcome. Keep it under 20 words.
Return ONLY the summary string, no quotes.`;

      const response = await openai.chat.completions.create({
        model: 'google/gemma-4-31b-it:free',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Conversation:\n${conversationText}` }
        ],
        temperature: 0.3,
        max_tokens: 50
      });

      let summary = response.choices[0]?.message?.content?.trim() || '';
      summary = summary.replace(/^"|"$|^'|'$/g, ''); // Remove outer quotes if any

      if (!summary) return null;

      const embedding = await this.embeddingService.generateEmbedding(summary);

      const episode = this.episodeRepository.create({
        user_id: userId,
        summary,
        embedding
      });

      console.log(`[EpisodeGenerator] Saved episode for user ${userId}: ${summary}`);
      return episode;
    } catch (error) {
      console.error('[EpisodeGenerator] Failed to generate episode:', error);
      return null;
    }
  }
}
