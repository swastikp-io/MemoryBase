/**
 * Chat Service — Supabase-backed CRUD for chats and messages.
 * 
 * All operations are protected by RLS — users can only access their own chats.
 * Message policies use JOIN through chats.user_id.
 */

import { supabase } from './supabase';
import type { Chat, ChatMessage } from './supabase-types';

// ────────────────────────────────────────────────────────────
// CHATS
// ────────────────────────────────────────────────────────────

export async function getChats(): Promise<Chat[]> {
  const { data, error } = await supabase
    .from('chats')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[ChatService] getChats error:', error.message);
    return [];
  }

  return data ?? [];
}

export async function createChat(
  userId: string,
  title: string = 'New Chat',
  modelName?: string
): Promise<Chat | null> {
  const { data, error } = await supabase
    .from('chats')
    .insert({
      user_id: userId,
      title,
      model_name: modelName ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error('[ChatService] createChat error:', error.message);
    return null;
  }

  return data;
}

export async function updateChat(
  chatId: string,
  updates: { title?: string; model_name?: string }
): Promise<boolean> {
  const { error } = await supabase
    .from('chats')
    .update(updates)
    .eq('id', chatId);

  if (error) {
    console.error('[ChatService] updateChat error:', error.message);
    return false;
  }

  return true;
}

export async function deleteChat(chatId: string): Promise<boolean> {
  // Messages are cascade-deleted by the database FK constraint
  const { error } = await supabase
    .from('chats')
    .delete()
    .eq('id', chatId);

  if (error) {
    console.error('[ChatService] deleteChat error:', error.message);
    return false;
  }

  return true;
}

// ────────────────────────────────────────────────────────────
// MESSAGES
// ────────────────────────────────────────────────────────────

export async function getChatMessages(chatId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[ChatService] getChatMessages error:', error.message);
    return [];
  }

  return data ?? [];
}

export async function saveMessage(
  chatId: string,
  role: 'user' | 'assistant',
  content: string,
  webSearchUsed: boolean = false
): Promise<ChatMessage | null> {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      chat_id: chatId,
      role,
      content,
      web_search_used: webSearchUsed,
    })
    .select()
    .single();

  if (error) {
    console.error('[ChatService] saveMessage error:', error.message);
    return null;
  }

  // Also touch the parent chat's updated_at
  await supabase
    .from('chats')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', chatId);

  return data;
}
