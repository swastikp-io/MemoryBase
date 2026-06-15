import { Memory, Episode } from '../../types/memory.ts';

export class ContextBuilder {
  static buildPrompt(
    memories: Memory[],
    episodes: Episode[],
    recentConversation: Array<{ role: string; content: string }>,
    currentUserMessage: string
  ): string {
    let prompt = '';

    if (memories.length > 0) {
      prompt += 'Relevant User Memories:\n';
      for (const memory of memories) {
        prompt += `* [${memory.category || 'general'}] ${memory.content}\n`;
      }
      prompt += '\n';
    }

    if (episodes.length > 0) {
      prompt += 'Relevant Episodic Memories:\n';
      for (const ep of episodes) {
        prompt += `* ${ep.summary}\n`;
      }
      prompt += '\n';
    }

    if (recentConversation.length > 0) {
      prompt += 'Recent Conversation:\n';
      for (const msg of recentConversation) {
        const contentStr = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
        prompt += `${msg.role.toUpperCase()}: ${contentStr}\n`;
      }
      prompt += '\n';
    }

    prompt += `Current User Message:\n${currentUserMessage}`;

    return prompt;
  }
}
