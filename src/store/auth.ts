import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  hasAccess: boolean;
  user: {
    fullName: string;
    email: string;
  } | null;
  grantAccess: (user: { fullName: string; email: string }) => void;
  revokeAccess: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      hasAccess: false,
      user: null,
      grantAccess: (user) => set({ hasAccess: true, user }),
      revokeAccess: () => set({ hasAccess: false, user: null }),
    }),
    {
      name: 'paralex-auth',
    }
  )
);
