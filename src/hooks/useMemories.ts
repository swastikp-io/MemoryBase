/**
 * useMemories — React hook for Supabase-backed memory CRUD.
 * 
 * Provides reactive memory state with optimistic UI updates.
 * Replaces the previous Express API proxy approach.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getMemories,
  createMemory,
  updateMemory,
  deleteMemory,
} from '../lib/memory-service';
import type { Memory } from '../lib/supabase-types';

export function useMemories(userId: string | null) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMemories = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    setError(null);

    try {
      const data = await getMemories(userId);
      setMemories(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  const addMemory = useCallback(
    async (content: string, category?: string, importance?: number) => {
      if (!userId) return null;
      setError(null);

      const memory = await createMemory(userId, content, category, importance);
      if (memory) {
        setMemories(prev => [memory, ...prev]);
      }
      return memory;
    },
    [userId]
  );

  const editMemory = useCallback(
    async (
      memoryId: string,
      updates: { content?: string; category?: string; importance?: number }
    ) => {
      setError(null);

      const updated = await updateMemory(memoryId, updates);
      if (updated) {
        setMemories(prev =>
          prev.map(m => (m.id === memoryId ? updated : m))
        );
      }
      return updated;
    },
    []
  );

  const removeMemory = useCallback(
    async (memoryId: string) => {
      setError(null);

      // Optimistic removal
      const prevMemories = memories;
      setMemories(prev => prev.filter(m => m.id !== memoryId));

      const success = await deleteMemory(memoryId);
      if (!success) {
        // Revert on failure
        setMemories(prevMemories);
        setError('Failed to delete memory');
      }
      return success;
    },
    [memories]
  );

  return {
    memories,
    isLoading,
    error,
    addMemory,
    editMemory,
    removeMemory,
    refreshMemories: loadMemories,
  };
}
