/**
 * Memory Service (Client) — Supabase-backed CRUD for user memories.
 * 
 * All operations are protected by RLS — users can only access their own memories.
 * This replaces the previous local SQLite-backed memory storage.
 */

import { supabase } from './supabase';
import type { Memory } from './supabase-types';

export async function getMemories(userId: string): Promise<Memory[]> {
  const { data, error } = await supabase
    .from('memories')
    .select('*')
    .eq('user_id', userId)
    .eq('memory_state', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[MemoryService] getMemories error:', error.message);
    return [];
  }

  return data ?? [];
}

export async function getAllMemories(userId: string): Promise<Memory[]> {
  const { data, error } = await supabase
    .from('memories')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[MemoryService] getAllMemories error:', error.message);
    return [];
  }

  return data ?? [];
}

export async function createMemory(
  userId: string,
  content: string,
  category?: string,
  importance: number = 0.5
): Promise<Memory | null> {
  const { data, error } = await supabase
    .from('memories')
    .insert({
      user_id: userId,
      content,
      category: category ?? null,
      importance,
      memory_state: 'active',
      occurrence_count: 1,
    })
    .select()
    .single();

  if (error) {
    console.error('[MemoryService] createMemory error:', error.message);
    return null;
  }

  return data;
}

export async function updateMemory(
  memoryId: string,
  updates: {
    content?: string;
    category?: string;
    importance?: number;
    memory_state?: string;
    occurrence_count?: number;
    last_seen_at?: string;
    superseded_by?: string;
    embedding?: string;
    embedding_status?: string;
  }
): Promise<Memory | null> {
  const { data, error } = await supabase
    .from('memories')
    .update(updates)
    .eq('id', memoryId)
    .select()
    .single();

  if (error) {
    console.error('[MemoryService] updateMemory error:', error.message);
    return null;
  }

  return data;
}

export async function deleteMemory(memoryId: string): Promise<boolean> {
  const { error } = await supabase
    .from('memories')
    .delete()
    .eq('id', memoryId);

  if (error) {
    console.error('[MemoryService] deleteMemory error:', error.message);
    return false;
  }

  return true;
}

export async function getMemoryById(memoryId: string): Promise<Memory | null> {
  const { data, error } = await supabase
    .from('memories')
    .select('*')
    .eq('id', memoryId)
    .single();

  if (error) {
    console.error('[MemoryService] getMemoryById error:', error.message);
    return null;
  }

  return data;
}
