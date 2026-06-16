/**
 * Profile Service — CRUD operations for the profiles table.
 * 
 * Profile records are auto-created by the database trigger on signup.
 * These functions are for read/update operations post-registration.
 */

import { supabase } from './supabase';
import type { Profile } from './supabase-types';

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('[ProfileService] getProfile error:', error.message);
    return null;
  }

  return data;
}

export async function updateProfile(
  userId: string,
  updates: {
    full_name?: string;
    github_username?: string;
  }
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('[ProfileService] updateProfile error:', error.message);
    return null;
  }

  return data;
}
