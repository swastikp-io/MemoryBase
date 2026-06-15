// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EpisodeGenerator } from '../services/memory/episodeGenerator.ts';
import { EpisodeRetrieval } from '../services/memory/episodeRetrieval.ts';
import { MemoryConsolidation } from '../services/memory/memoryConsolidation.ts';
import { ReflectionEngine } from '../services/memory/reflectionEngine.ts';
import { EpisodeRepository } from '../repositories/episodeRepository.ts';
import { MemoryService } from '../services/memoryService.ts';

// Mock OpenAI
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(function() {
      return {
        chat: {
          completions: {
            create: vi.fn().mockImplementation(async ({ messages, response_format }) => {
              if (response_format?.type === 'json_object') {
                return {
                  choices: [{
                    message: {
                      content: JSON.stringify({
                        merges: [
                          { sourceIds: ['1', '2'], mergedContent: 'merged 1 and 2', category: 'preference' }
                        ],
                        updates: [
                          { memoryId: '3', newContent: 'updated 3' }
                        ],
                        conflicts: [
                          { memoryIds: ['4', '5'], reason: 'conflict' }
                        ]
                      })
                    }
                  }]
                };
              }
              return {
                choices: [{
                  message: { content: 'User talked about testing episodes' }
                }]
              };
            })
          }
        },
        embeddings: {
          create: vi.fn().mockResolvedValue({
            data: [{ embedding: new Array(1536).fill(0.5) }]
          })
        }
      };
    })
  };
});

vi.mock('../repositories/episodeRepository.ts');
vi.mock('../services/memoryService.ts');

describe('Episodic Memory & Reflection V4', () => {
  let episodeGenerator: EpisodeGenerator;
  let episodeRetrieval: EpisodeRetrieval;
  let memoryConsolidation: MemoryConsolidation;
  let reflectionEngine: ReflectionEngine;
  let mockEpRepo: any;
  let mockMemService: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockEpRepo = {
      create: vi.fn(ep => ({ id: 'ep1', ...ep })),
      findByUserId: vi.fn()
    };
    vi.mocked(EpisodeRepository).mockImplementation(function() {
      return mockEpRepo;
    } as any);

    mockMemService = {
      getUserMemories: vi.fn(),
      getMemoryById: vi.fn(),
      createMemory: vi.fn(),
      updateMemory: vi.fn(),
      deleteMemory: vi.fn()
    };
    vi.mocked(MemoryService).mockImplementation(function() {
      return mockMemService;
    } as any);

    episodeGenerator = new EpisodeGenerator();
    episodeRetrieval = new EpisodeRetrieval();
    memoryConsolidation = new MemoryConsolidation();
    reflectionEngine = new ReflectionEngine();
  });

  describe('Episode Generator', () => {
    it('should generate and save an episode', async () => {
      const mockOpenAI = {
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [{ message: { content: 'User talked about testing episodes' } }]
            })
          }
        }
      };
      const episode = await episodeGenerator.generateAndSaveEpisode(mockOpenAI as any, 'user1', [{ role: 'user', content: 'test' }]);
      expect(episode).toBeTruthy();
      expect(episode?.summary).toBe('User talked about testing episodes');
      expect(mockEpRepo.create).toHaveBeenCalled();
    });
  });

  describe('Episode Retrieval', () => {
    it('should retrieve episodes based on similarity', async () => {
      mockEpRepo.findByUserId.mockReturnValue([
        { id: 'ep1', summary: 'test', embedding: new Array(1536).fill(0.5) }
      ]);
      const episodes = await episodeRetrieval.retrieveEpisodes('user1', 'test');
      expect(episodes.length).toBe(1);
    });
  });

  describe('Memory Consolidation', () => {
    it('should merge memories successfully', async () => {
      mockMemService.getMemoryById.mockReturnValue({ importance: 0.8 });
      mockMemService.createMemory.mockResolvedValue({ id: 'new_merged' });
      
      const merged = await memoryConsolidation.merge('user1', ['1', '2'], 'merged content', 'pref');
      
      expect(merged?.id).toBe('new_merged');
      expect(mockMemService.deleteMemory).toHaveBeenCalledWith('1');
      expect(mockMemService.deleteMemory).toHaveBeenCalledWith('2');
    });

    it('should update memory', async () => {
      await memoryConsolidation.update('3', { content: 'updated 3' });
      expect(mockMemService.updateMemory).toHaveBeenCalledWith('3', { content: 'updated 3' });
    });
  });

  describe('Reflection Engine', () => {
    it('should process merges, updates, and conflicts', async () => {
      // Mock consolidation service inside reflection engine
      const mergeSpy = vi.spyOn(memoryConsolidation, 'merge').mockResolvedValue(null);
      const updateSpy = vi.spyOn(memoryConsolidation, 'update').mockResolvedValue({} as any);
      
      // Inject the spied service (dirty workaround for tests, reflection engine instantiates it internally, 
      // but we mocked MemoryService, so we'll just test the ReflectionEngine parses JSON correctly and calls underlying).
      // Since ReflectionEngine instantiates MemoryConsolidation, and MemoryService is mocked, it will use the mocked MemoryService.
      
      mockMemService.getUserMemories.mockReturnValue([
        { id: '1', content: 'm1' },
        { id: '2', content: 'm2' }
      ]);
      mockMemService.getMemoryById.mockReturnValue({ importance: 0.5 });
      mockMemService.createMemory.mockResolvedValue({ id: 'merged' });

      await reflectionEngine.runReflection('user1');

      // Check if delete was called twice (for merge) and create was called once
      expect(mockMemService.createMemory).toHaveBeenCalledWith('user1', 'merged 1 and 2', 'preference', 0.5);
      expect(mockMemService.deleteMemory).toHaveBeenCalledWith('1');
      expect(mockMemService.deleteMemory).toHaveBeenCalledWith('2');
      expect(mockMemService.updateMemory).toHaveBeenCalledWith('3', { content: 'updated 3' });
    });
  });
});
