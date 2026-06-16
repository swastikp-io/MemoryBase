/**
 * Supabase Server Client — For server-side operations in the Express backend.
 * 
 * Uses the service_role key for admin-level access (bypasses RLS).
 * Only use this for server-side operations that need elevated privileges,
 * such as the memory extraction pipeline and background jobs.
 * 
 * For user-scoped operations, use the user's access token with the anon client instead.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let _adminClient: SupabaseClient | null = null;

/**
 * Returns a Supabase client with service_role privileges.
 * Lazily initialized to avoid errors during import if env vars aren't set.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!_adminClient) {
    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('[SupabaseServer] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Admin client unavailable.');
      // Return a client that will fail gracefully
    }
    _adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return _adminClient;
}

/**
 * Returns a Supabase client scoped to a specific user's session.
 * This client respects RLS policies — the user can only access their own data.
 */
export function getSupabaseForUser(accessToken: string): SupabaseClient {
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
  return createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
