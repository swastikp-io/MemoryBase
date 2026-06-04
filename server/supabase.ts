import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing server Supabase environment variables. Add SUPABASE_URL and SUPABASE_ANON_KEY to .env.');
}

export const supabaseServer = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '');

export function getBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice('Bearer '.length).trim();
}

export async function getUserFromToken(accessToken: string | null) {
  if (!accessToken) {
    return null;
  }

  const { data, error } = await supabaseServer.auth.getUser(accessToken);
  if (error || !data.user) {
    return null;
  }

  return data.user;
}

export function createSupabaseForUser(accessToken: string) {
  return createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}
