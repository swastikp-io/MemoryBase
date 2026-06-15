import OpenAI from 'openai';
import { MemoryService } from '../memoryService.ts';
import { MemoryConsolidation } from './memoryConsolidation.ts';

export class ReflectionEngine {
  private memoryService: MemoryService;
  private consolidationService: MemoryConsolidation;
  private openai: OpenAI;

  constructor() {
    this.memoryService = new MemoryService();
    this.consolidationService = new MemoryConsolidation();
    this.openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY || "dummy_key",
    });
  }

  async runReflection(userId: string) {
    console.log(`[ReflectionEngine] Starting reflection for user ${userId}`);
    const memories = this.memoryService.getUserMemories(userId);
    if (memories.length < 2) return;

    const memoriesText = memories.map(m => `[ID: ${m.id}] ${m.content}`).join('\n');

    const prompt = `You are a Memory Reflection Engine.
Analyze the following list of user memories and identify optimizations.
1. MERGE: Find duplicate or highly overlapping memories that should be merged.
2. UPDATE: Find outdated memories that are superseded by newer ones.
3. CONFLICT: Find contradictory memories.

Return a JSON object with this exact structure:
{
  "merges": [
    { "sourceIds": ["id1", "id2"], "mergedContent": "combined text", "category": "category" }
  ],
  "updates": [
    { "memoryId": "id1", "newContent": "updated text" }
  ],
  "conflicts": [
    { "memoryIds": ["id1", "id2"], "reason": "why they conflict" }
  ]
}
If there are no optimizations, return empty arrays.

Memories:
${memoriesText}
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      });

      const rawContent = response.choices[0]?.message?.content || '{}';
      
      let result;
      try {
        result = JSON.parse(rawContent);
      } catch {
        const cleaned = rawContent.replace(/```json\n?|\n?```/g, '').trim();
        result = JSON.parse(cleaned);
      }

      if (result.merges) {
        for (const merge of result.merges) {
          if (merge.sourceIds && merge.sourceIds.length >= 2) {
            console.log(`[ReflectionEngine] Merging memories: ${merge.sourceIds.join(', ')}`);
            await this.consolidationService.merge(userId, merge.sourceIds, merge.mergedContent, merge.category);
          }
        }
      }

      if (result.updates) {
        for (const update of result.updates) {
          console.log(`[ReflectionEngine] Updating memory ${update.memoryId}`);
          await this.consolidationService.update(update.memoryId, { content: update.newContent });
        }
      }

      if (result.conflicts && result.conflicts.length > 0) {
        for (const conflict of result.conflicts) {
          console.warn(`[ReflectionEngine] Conflict detected between ${conflict.memoryIds?.join(', ')}: ${conflict.reason}`);
          // Flag for review (could write to a new 'conflicts' table, for now just log it)
        }
      }
      
      console.log(`[ReflectionEngine] Reflection complete for user ${userId}`);

    } catch (error) {
      console.error('[ReflectionEngine] Reflection failed:', error);
    }
  }
}
