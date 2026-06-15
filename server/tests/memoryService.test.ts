// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryService } from '../services/memoryService.ts';
import { MemoryRepository } from '../repositories/memoryRepository.ts';

vi.mock('../repositories/memoryRepository.ts');
vi.mock('../services/memory/embeddingService.ts', () => {
  const EmbeddingService = vi.fn();
  EmbeddingService.prototype.generateEmbeddingWithStatus = vi.fn().mockResolvedValue({ status: 'failed' });
  EmbeddingService.prototype.generateEmbedding = vi.fn().mockResolvedValue([]);
  return { EmbeddingService };
});

describe('MemoryService', () => {
  let memoryService: MemoryService;
  let mockRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockRepo = {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      markSuperseded: vi.fn(),
      findByUserId: vi.fn(),
      findActiveByUserId: vi.fn(),
      findById: vi.fn(),
    };

    // Override the constructor to return our mock repo
    vi.mocked(MemoryRepository).mockImplementation(function() {
      return mockRepo;
    } as any);

    memoryService = new MemoryService();
  });

  describe('createMemory', () => {
    it('should create a memory with default importance', async () => {
      const mockMemory = { id: '1', user_id: 'user1', content: 'test content', importance: 0.5, embedding_status: 'failed' };
      mockRepo.findActiveByUserId.mockReturnValue([]);
      mockRepo.create.mockReturnValue(mockMemory);

      const result = await memoryService.createMemory('user1', 'test content');

      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        user_id: 'user1',
        content: 'test content',
        category: undefined,
        importance: 0.5,
        embedding_status: 'failed',
        memory_state: 'active',
      }));
      expect(result).toEqual(mockMemory);
    });

    it('should throw an error if content is empty', async () => {
      await expect(memoryService.createMemory('user1', '   ')).rejects.toThrow('Content is required');
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('should merge normalized duplicates into occurrence count', async () => {
      const existing = { id: '1', user_id: 'user1', content: 'User startup is MemoryBase', importance: 0.8, occurrence_count: 1 };
      const updated = { ...existing, occurrence_count: 2 };
      mockRepo.findActiveByUserId.mockReturnValue([existing]);
      mockRepo.update.mockReturnValue(updated);

      const result = await memoryService.createMemory('user1', 'My startup is called MemoryBase', 'work', 0.9);

      expect(mockRepo.create).not.toHaveBeenCalled();
      expect(mockRepo.update).toHaveBeenCalledWith('1', expect.objectContaining({ occurrence_count: 2, importance: 0.9 }));
      expect(result).toEqual(updated);
    });

    it('should supersede conflicting memories in the same slot', async () => {
      const existing = { id: 'old', user_id: 'user1', content: 'User favorite language is Python', importance: 0.8, occurrence_count: 1 };
      const created = { id: 'new', user_id: 'user1', content: 'User favorite language is TypeScript', importance: 0.9 };
      mockRepo.findActiveByUserId.mockReturnValue([existing]);
      mockRepo.create.mockReturnValue(created);

      await memoryService.createMemory('user1', 'User favorite language is TypeScript', 'preference', 0.9);

      expect(mockRepo.markSuperseded).toHaveBeenCalledWith('old', 'new');
    });
  });

  describe('updateMemory', () => {
    it('should update a memory successfully', () => {
      const mockUpdated = { id: '1', content: 'updated', importance: 0.8 };
      mockRepo.update.mockReturnValue(mockUpdated);

      const result = memoryService.updateMemory('1', { content: 'updated', importance: 0.8 });

      expect(mockRepo.update).toHaveBeenCalledWith('1', { content: 'updated', importance: 0.8 });
      expect(result).toEqual(mockUpdated);
    });

    it('should throw an error if memory not found', () => {
      mockRepo.update.mockReturnValue(undefined);

      expect(() => memoryService.updateMemory('999', { content: 'updated' })).toThrow('Memory not found');
    });

    it('should throw an error if updating with empty content', () => {
      expect(() => memoryService.updateMemory('1', { content: '   ' })).toThrow('Content cannot be empty');
      expect(mockRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteMemory', () => {
    it('should delete a memory successfully', () => {
      mockRepo.delete.mockReturnValue(true);

      const result = memoryService.deleteMemory('1');

      expect(mockRepo.delete).toHaveBeenCalledWith('1');
      expect(result).toBe(true);
    });

    it('should throw an error if memory not found', () => {
      mockRepo.delete.mockReturnValue(false);

      expect(() => memoryService.deleteMemory('999')).toThrow('Memory not found');
    });
  });

  describe('getUserMemories', () => {
    it('should fetch user memories successfully', () => {
      const mockMemories = [{ id: '1', content: 'test' }];
      mockRepo.findActiveByUserId.mockReturnValue(mockMemories);

      const result = memoryService.getUserMemories('user1');

      expect(mockRepo.findActiveByUserId).toHaveBeenCalledWith('user1');
      expect(result).toEqual(mockMemories);
    });

    it('should throw an error if userId is not provided', () => {
      expect(() => memoryService.getUserMemories('')).toThrow('User ID is required');
    });
  });
});
