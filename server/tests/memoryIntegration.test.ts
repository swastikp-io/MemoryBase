// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryService } from '../services/memoryService.ts';
import { MemoryExtractor } from '../services/memory/memoryExtractor.ts';
import { MemoryRetrieval } from '../services/memory/memoryRetrieval.ts';
import { ContextBuilder } from '../services/memory/contextBuilder.ts';
import { MemoryRepository } from '../repositories/memoryRepository.ts';

vi.mock('../repositories/memoryRepository.ts');
vi.mock('../services/memory/embeddingService.ts', () => {
  const EmbeddingService = vi.fn();
  EmbeddingService.prototype.generateEmbeddingWithStatus = vi.fn().mockResolvedValue({ status: 'failed' });
  EmbeddingService.prototype.generateEmbedding = vi.fn().mockResolvedValue([]);
  return { EmbeddingService };
});

describe('Memory Layer V2 Integration', () => {
  let mockRepo: any;
  let memoryService: MemoryService;
  let memoryExtractor: MemoryExtractor;
  let memoryRetrieval: MemoryRetrieval;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRepo = {
      create: vi.fn((mem) => ({ id: '123', ...mem })),
      findByContent: vi.fn(),
      findByUserId: vi.fn(),
      findActiveByUserId: vi.fn(),
      update: vi.fn(),
      markSuperseded: vi.fn(),
    };

    vi.mocked(MemoryRepository).mockImplementation(function() {
      return mockRepo as any;
    } as any);

    memoryService = new MemoryService();
    memoryExtractor = new MemoryExtractor();
    memoryRetrieval = new MemoryRetrieval();
  });

  describe('ContextBuilder', () => {
    it('should build prompt correctly with memories and recent history', () => {
      const memories = [
        { id: '1', user_id: 'user1', content: 'Prefers python', category: 'preference', importance: 0.8, created_at: '', updated_at: '' }
      ];
      const recent = [
        { role: 'user', content: 'hi' },
        { role: 'assistant', content: 'hello' }
      ];
      
      const prompt = ContextBuilder.buildPrompt(memories, [], recent, 'how do I loop?');
      
      expect(prompt).toContain('Relevant User Memories:');
      expect(prompt).toContain('* [preference] Prefers python');
      expect(prompt).toContain('Recent Conversation:');
      expect(prompt).toContain('USER: hi');
      expect(prompt).toContain('Current User Message:');
      expect(prompt).toContain('how do I loop?');
    });
  });

  describe('MemoryRetrieval', () => {
    it('should retrieve memories based on keyword matching', () => {
      const mockMemories = [
        { id: '1', user_id: 'user1', content: 'I am a backend developer', category: 'identity', importance: 0.9, created_at: '', updated_at: '' },
        { id: '2', user_id: 'user1', content: 'I like apples', category: 'preference', importance: 0.8, created_at: '', updated_at: '' }
      ];
      mockRepo.findActiveByUserId.mockReturnValue(mockMemories);

      const retrieved = memoryRetrieval.retrieveMemories('user1', 'I need help with my backend');
      
      expect(retrieved.length).toBeGreaterThan(0);
      expect(retrieved[0].content).toBe('I am a backend developer');
    });
  });

  describe('MemoryExtractor', () => {
    it('should extract and save valid memories with importance >= 0.7', async () => {
      const mockOpenAI = {
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      memories: [
                        { content: 'New memory 1', category: 'skill', importance: 0.8 },
                        { content: 'New memory 2', category: 'preference', importance: 0.5 } // should be rejected
                      ]
                    })
                  }
                }
              ]
            })
          }
        }
      };

      mockRepo.findActiveByUserId.mockReturnValue([]); // no duplicates
      
      await memoryExtractor.extractAndSave(mockOpenAI as any, 'user1', [
        { role: 'user', content: 'I know java' }
      ]);

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalled();
      
      // Only importance >= 0.7 is saved
      expect(mockRepo.create).toHaveBeenCalledTimes(1);
      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        content: 'New memory 1'
      }));
    });

    it('should not save duplicate memories', async () => {
      const mockOpenAI = {
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      memories: [
                        { content: 'Duplicate memory', category: 'skill', importance: 0.9 }
                      ]
                    })
                  }
                }
              ]
            })
          }
        }
      };

      // Mock duplicate exists
      mockRepo.findActiveByUserId.mockReturnValue([{ id: 'existing', content: 'Duplicate memory', importance: 0.9, occurrence_count: 1 }]);
      mockRepo.update.mockReturnValue({ id: 'existing', content: 'Duplicate memory', occurrence_count: 2 });
      
      await memoryExtractor.extractAndSave(mockOpenAI as any, 'user1', [
        { role: 'user', content: 'I know java' }
      ]);

      expect(mockRepo.create).not.toHaveBeenCalled();
      expect(mockRepo.update).toHaveBeenCalled();
    });
  });
});
