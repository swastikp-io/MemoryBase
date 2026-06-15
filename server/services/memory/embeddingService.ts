import OpenAI from 'openai';
import crypto from 'crypto';

export class EmbeddingService {
  private openai: OpenAI;
  private cache: Map<string, number[]> = new Map();
  private modelName = 'openai/text-embedding-3-small';

  constructor() {
    this.openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY || "dummy_key",
    });
  }

  private hashText(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const result = await this.generateEmbeddingWithStatus(text);
    return result.embedding;
  }

  async generateEmbeddingWithStatus(text: string): Promise<{ embedding?: number[]; status: 'completed' | 'failed' }> {
    const hash = this.hashText(text);
    if (this.cache.has(hash)) {
      return { embedding: this.cache.get(hash)!, status: 'completed' };
    }

    try {
      const response = await this.openai.embeddings.create({
        model: this.modelName,
        input: text
      });

      const embedding = response.data[0].embedding;
      this.cache.set(hash, embedding);
      return { embedding, status: 'completed' };
    } catch (error) {
      console.error('[EmbeddingService] Error generating embedding:', error);
      return { status: 'failed' };
    }
  }

  async batchGenerateEmbeddings(texts: string[]): Promise<number[][]> {
    const results: number[][] = new Array(texts.length);
    const textsToFetch: { index: number; text: string }[] = [];

    // Check cache first
    for (let i = 0; i < texts.length; i++) {
      const hash = this.hashText(texts[i]);
      if (this.cache.has(hash)) {
        results[i] = this.cache.get(hash)!;
      } else {
        textsToFetch.push({ index: i, text: texts[i] });
      }
    }

    if (textsToFetch.length > 0) {
      try {
        const response = await this.openai.embeddings.create({
          model: this.modelName,
          input: textsToFetch.map(t => t.text)
        });

        for (let i = 0; i < response.data.length; i++) {
          const embedding = response.data[i].embedding;
          const { index, text } = textsToFetch[i];
          const hash = this.hashText(text);
          this.cache.set(hash, embedding);
          results[index] = embedding;
        }
      } catch (error) {
        console.error('[EmbeddingService] Error in batch embedding generation:', error);
        for (const item of textsToFetch) {
          results[item.index] = [];
        }
      }
    }

    return results;
  }
}
