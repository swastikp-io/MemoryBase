/**
 * Auth Store — Zustand bridge for Supabase Auth state.
 * 
 * This store syncs with Supabase Auth via onAuthStateChange and provides
 * the same interface that the rest of the app expects (hasAccess, user, token).
 * 
 * IMPORTANT: This is a compatibility bridge. Components that need full auth
 * functionality should use the useAuth hook directly. This store exists so that
 * existing components (Sidebar, ProtectedRoute, chatStore's fetchWithAuth)
 * continue to work without a full rewrite.
 */

import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { signOut as supabaseSignOut } from '../lib/auth-service';

interface AuthState {
  hasAccess: boolean;
  user: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  token: string | null;
  isLoading: boolean;

  // Initialize the store by subscribing to Supabase auth state
  initialize: () => () => void;
  revokeAccess: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  hasAccess: false,
  user: null,
  token: null,
  isLoading: true,

  initialize: () => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const meta = session.user.user_metadata;
        set({
          hasAccess: true,
          user: {
            id: session.user.id,
            fullName: meta?.full_name || meta?.name || meta?.user_name || '',
            email: session.user.email || '',
          },
          token: session.access_token,
          isLoading: false,
        });
      } else {
        set({ hasAccess: false, user: null, token: null, isLoading: false });
      }
    });

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          const meta = session.user.user_metadata;
          set({
            hasAccess: true,
            user: {
              id: session.user.id,
              fullName: meta?.full_name || meta?.name || meta?.user_name || '',
              email: session.user.email || '',
            },
            token: session.access_token,
            isLoading: false,
          });
        } else {
          set({ hasAccess: false, user: null, token: null, isLoading: false });
        }
      }
    );

    // Return cleanup function
    return () => subscription.unsubscribe();
  },

  revokeAccess: async () => {
    await supabaseSignOut();
    set({ hasAccess: false, user: null, token: null });
  },
}));
