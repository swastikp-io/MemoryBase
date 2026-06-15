import OpenAI from 'openai';
import { MemoryService } from '../memoryService.ts';

export class MemoryExtractor {
  private memoryService: MemoryService;

  constructor() {
    this.memoryService = new MemoryService();
  }

  async extractAndSave(
    openai: OpenAI,
    userId: string,
    messages: Array<{ role: string; content: string }>
  ): Promise<{ extracted: any[]; stored: any[] }> {
    const result = { extracted: [] as any[], stored: [] as any[] };
    try {
      const recentMessages = messages.slice(-5); // Look at last 5 messages for context
      const conversationText = recentMessages
        .map((m) => {
          let contentStr = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
          return `${m.role.toUpperCase()}: ${contentStr}`;
        })
        .join('\n');

      const systemPrompt = `You are a Memory Extractor for an AI assistant.
Your task is to extract long-term useful information about the user from the recent conversation.

Rules:
1. Extract ONLY information that is long-term useful (e.g., identity, preference, skill, goal, work).
2. IGNORE temporary information, one-time requests, and small talk.
3. Keep the content concise and descriptive.
4. Categorize each memory into exactly one of the following: identity, preference, skill, goal, work.
5. Assign an importance score between 0.0 and 1.0. Higher means more critical to remember. (Only importance >= 0.7 will be saved).

Return ONLY a valid JSON object with a "memories" array containing objects with "content", "category", and "importance". Format:
{
  "memories": [
    {
      "content": "User prefers dark mode",
      "category": "preference",
      "importance": 0.8
    }
  ]
}`;

      const response = await openai.chat.completions.create({
        model: 'google/gemma-4-31b-it:free', // Default fallback model if needed, but we'll use a reliable JSON model if possible. OpenRouter handles formatting best on standard models.
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Conversation:\n${conversationText}` }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      const responseContent = response.choices[0]?.message?.content || '{}';
      
      let parsed;
      try {
        parsed = JSON.parse(responseContent);
      } catch (e) {
        // Fallback cleanup if the model returned markdown blocks
        const cleaned = responseContent.replace(/```json\n?|\n?```/g, '').trim();
        parsed = JSON.parse(cleaned);
      }

      const memories = parsed.memories || [];
      result.extracted = memories;

      for (const memory of memories) {
        if (memory.importance >= 0.7) {
          const created = await this.memoryService.createMemory(
            userId,
            memory.content,
            memory.category,
            memory.importance
          );
          if (created) {
            result.stored.push(created);
            console.log(`[MemoryExtractor] Extracted and saved memory: ${memory.content}`);
          }
        } else {
          console.log(`[MemoryExtractor] Rejected memory (importance ${memory.importance} < 0.7): ${memory.content}`);
        }
      }
      
    } catch (error) {
      console.error('[MemoryExtractor] Failed to extract memories:', error);
    }
    return result;
  }
}
