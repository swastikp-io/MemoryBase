// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HybridMemoryRetrieval } from '../services/memory/hybridMemoryRetrieval.ts';
import { MemoryService } from '../services/memoryService.ts';
import { ContextBuilder } from '../services/memory/contextBuilder.ts';
import { injectContext } from '../orchestrator/contextInjector.ts';

vi.mock('../services/memory/embeddingService.ts', () => {
  const EmbeddingService = vi.fn();
  EmbeddingService.prototype.generateEmbeddingWithStatus = vi.fn().mockResolvedValue({ status: 'failed' });
  EmbeddingService.prototype.generateEmbedding = vi.fn().mockResolvedValue([]);
  return { EmbeddingService };
});

vi.mock('../services/memoryService.ts');
vi.mock('../personalization/personalizationService.ts', () => ({
  PersonalizationService: {
    generatePersonalizedPrompt: vi.fn((_userId, _messages, memories) => {
      const memoryLines = memories.map((memory: any) => `- ${memory.text}`).join('\n');
      return `System\n\n# User Memories\n${memoryLines}`;
    }),
  },
}));

describe('Hybrid memory pipeline', () => {
  let mockMemoryService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockMemoryService = {
      getUserMemories: vi.fn(),
    };
    vi.mocked(MemoryService).mockImplementation(function() {
      return mockMemoryService as any;
    } as any);
  });

  it('falls back to keyword retrieval when embeddings fail', async () => {
    mockMemoryService.getUserMemories.mockReturnValue([
      {
        id: 'rust',
        user_id: 'user1',
        content: 'User favorite programming language is Rust',
        category: 'preference',
        importance: 0.9,
        embedding_status: 'failed',
        memory_state: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);

    const results = await new HybridMemoryRetrieval().retrieve('user1', 'What programming language do I prefer?');

    expect(results).toHaveLength(1);
    expect(results[0].source).toBe('keyword');
    expect(results[0].memory.content).toContain('Rust');
  });

  it('injects retrieved memories into context builder and prompt compiler', async () => {
    const memory = {
      id: 'rust',
      user_id: 'user1',
      content: 'User favorite programming language is Rust',
      category: 'preference',
      importance: 0.9,
      embedding_status: 'failed' as const,
      memory_state: 'active' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const context = ContextBuilder.buildPrompt([memory], [], [], 'What programming language do I prefer?');
    const messages = await injectContext('user1', 'token', [{ role: 'user', content: 'What programming language do I prefer?' }], [memory]);

    expect(context).toContain('Relevant User Memories');
    expect(context).toContain('Rust');
    expect(messages[0].content).toContain('# User Memories');
    expect(messages[0].content).toContain('Rust');
  });
});
