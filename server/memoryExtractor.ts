import OpenAI from 'openai';
import { memoryStore } from './memoryStore.ts';

export class MemoryExtractor {
  static async extract(openai: OpenAI, userId: string, accessToken: string, messages: any[], model: string): Promise<boolean> {
    if (!messages || messages.length === 0) return false;

    // Grab the last few messages for context, primarily looking at user messages
    const recentMessages = messages.slice(-5);
    let userText = "";
    recentMessages.forEach((msg: any) => {
      if (msg.role === "user" && typeof msg.content === "string") {
        userText += msg.content + "\n";
      } else if (msg.role === "user" && Array.isArray(msg.content)) {
        msg.content.forEach((c: any) => {
          if (c.type === "text") userText += c.text + "\n";
        });
      }
    });

    if (!userText.trim()) return false;

    const extractionPrompt = `You are a memory extraction assistant. Analyze the user's latest inputs and extract any distinct, explicit personal facts, preferences, or project details.
If there are no explicit personal facts, return an empty array.
Output MUST be in strict JSON format as an array of objects.
Example output:
[
  { "text": "User is a vegan", "type": "preference", "importanceScore": 0.8 },
  { "text": "User is working on a React application", "type": "project", "importanceScore": 0.6 }
]

Do not output any markdown formatting, only the JSON array.`;

    try {
      const response = await openai.chat.completions.create({
        model: model || "openai/gpt-oss-20b:free",
        messages: [
          { role: "system", content: extractionPrompt },
          { role: "user", content: `User inputs:\n${userText}` }
        ],
        temperature: 0,
        max_tokens: 300,
      });

      const content = response.choices[0]?.message?.content || "[]";
      
      // Clean potential markdown blocks
      const cleaned = content.replace(/```json/g, "").replace(/```/g, "").trim();
      const extracted = JSON.parse(cleaned);

      if (Array.isArray(extracted) && extracted.length > 0) {
        const writes = extracted.map(async (memory: any) => {
          if (memory.text && memory.type) {
            try {
              await memoryStore.addMemory({
                userId: userId,
                text: memory.text,
                type: memory.type,
                importanceScore: memory.importanceScore || 0.5
              }, accessToken);
              return true;
            } catch (error) {
              console.error('[MemoryExtractor] Failed to save extracted memory:', error);
              throw error;
            }
          }
          return false;
        });
        const results = await Promise.all(writes);
        const added = results.some(Boolean);
        console.log(`[MemoryExtractor] Extracted ${extracted.length} memories for user ${userId}`);
        return added;
      }
      return false;
    } catch (e: any) {
      if (e?.status === 429 || e?.message?.includes("429") || e?.message?.includes("RateLimitError")) {
        console.warn(`[MemoryExtractor] Rate limit exceeded (429). Skipping memory extraction.`);
      } else {
        console.error("[MemoryExtractor] Failed to extract memory:", e);
      }
      return false;
    }
  }
}
