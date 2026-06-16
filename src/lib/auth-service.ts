/**
 * Auth Service — Wraps all Supabase Auth operations.
 * 
 * SECURITY: Passwords are NEVER stored in custom tables.
 * All password management is handled exclusively by Supabase Auth.
 */

import { supabase } from './supabase';
import type { AuthError, Session, User } from '@supabase/supabase-js';

export interface AuthResult {
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}

// ────────────────────────────────────────────────────────────
// EMAIL REGISTRATION
// ────────────────────────────────────────────────────────────
export async function signUpWithEmail(
  email: string,
  password: string,
  fullName: string
): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        // github_username is null for email signups
      },
    },
  });

  return {
    user: data.user,
    session: data.session,
    error,
  };
}

// ────────────────────────────────────────────────────────────
// EMAIL LOGIN
// ────────────────────────────────────────────────────────────
export async function signInWithEmail(
  email: string,
  password: string
): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return {
    user: data.user,
    session: data.session,
    error,
  };
}

// ────────────────────────────────────────────────────────────
// GITHUB OAUTH LOGIN
// ────────────────────────────────────────────────────────────
export async function signInWithGitHub(): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${window.location.origin}/chat`,
    },
  });

  return { error };
}

// ────────────────────────────────────────────────────────────
// LOGOUT
// ────────────────────────────────────────────────────────────
export async function signOut(): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signOut();
  return { error };
}

// ────────────────────────────────────────────────────────────
// SESSION HELPERS
// ────────────────────────────────────────────────────────────
export async function getSession(): Promise<Session | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Returns the current access token for server-side API calls.
 * This token is passed as `Authorization: Bearer <token>` to the Express backend.
 */
export async function getAccessToken(): Promise<string | null> {
  const session = await getSession();
  return session?.access_token ?? null;
}
