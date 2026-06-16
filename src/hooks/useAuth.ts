/**
 * useAuth — React hook for Supabase Auth state management.
 * 
 * Replaces the old Zustand-based auth store + JWT cookie approach.
 * Subscribes to Supabase auth state changes and provides reactive auth state.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  signUpWithEmail,
  signInWithEmail,
  signInWithGitHub,
  signOut,
  getSession,
} from '../lib/auth-service';
import { getProfile } from '../lib/profile-service';
import type { User, Session } from '@supabase/supabase-js';
import type { Profile } from '../lib/supabase-types';

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Load profile when user changes
  const loadProfile = useCallback(async (userId: string) => {
    const profile = await getProfile(userId);
    setState(prev => ({ ...prev, profile }));
  }, []);

  // Initialize auth state and subscribe to changes
  useEffect(() => {
    let mounted = true;

    // Get initial session
    const initAuth = async () => {
      const session = await getSession();
      if (!mounted) return;

      if (session?.user) {
        setState({
          user: session.user,
          session,
          profile: null,
          isLoading: false,
          isAuthenticated: true,
        });
        loadProfile(session.user.id);
      } else {
        setState({
          user: null,
          session: null,
          profile: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    };

    initAuth();

    // Subscribe to auth state changes (login, logout, token refresh, OAuth callback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (session?.user) {
          setState(prev => ({
            ...prev,
            user: session.user,
            session,
            isLoading: false,
            isAuthenticated: true,
          }));

          // Load profile for new sessions (SIGNED_IN includes OAuth callback)
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            loadProfile(session.user.id);
          }
        } else {
          setState({
            user: null,
            session: null,
            profile: null,
            isLoading: false,
            isAuthenticated: false,
          });
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  // ────────────────────────────────────────────────────────────
  // Action methods
  // ────────────────────────────────────────────────────────────

  const handleSignUpWithEmail = useCallback(
    async (email: string, password: string, fullName: string) => {
      const result = await signUpWithEmail(email, password, fullName);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result;
    },
    []
  );

  const handleSignInWithEmail = useCallback(
    async (email: string, password: string) => {
      const result = await signInWithEmail(email, password);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result;
    },
    []
  );

  const handleSignInWithGitHub = useCallback(async () => {
    const result = await signInWithGitHub();
    if (result.error) {
      throw new Error(result.error.message);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    const { error } = await signOut();
    if (error) {
      console.error('[useAuth] signOut error:', error.message);
    }
    // State is updated by the onAuthStateChange listener
  }, []);

  return {
    ...state,
    signUp: handleSignUpWithEmail,
    signIn: handleSignInWithEmail,
    signInWithGitHub: handleSignInWithGitHub,
    signOut: handleSignOut,
    refreshProfile: () => state.user && loadProfile(state.user.id),
  };
}
