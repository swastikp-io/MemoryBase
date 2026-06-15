import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  hasAccess: boolean;
  user: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  token: string | null;
  grantAccess: (user: { id: string; fullName: string; email: string }, token: string) => void;
  revokeAccess: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      hasAccess: false,
      user: null,
      token: null,
      grantAccess: (user, token) => set({ hasAccess: true, user, token }),
      revokeAccess: () => set({ hasAccess: false, user: null, token: null }),
    }),
    {
      name: 'memorybase-auth',
    }
  )
);
