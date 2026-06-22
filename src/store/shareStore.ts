import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Message } from './chatStore';

export interface ShareRecord {
  id: string;
  conversationId: string;
  message: Message;
  createdAt: string;
  ownerId: string;
  visibility: 'public';
}

interface ShareStore {
  shares: Record<string, ShareRecord>;
  createShare: (share: ShareRecord) => void;
  getShare: (id: string) => ShareRecord | undefined;
}

export const useShareStore = create<ShareStore>()(
  persist(
    (set, get) => ({
      shares: {},
      createShare: (share) =>
        set((state) => ({
          shares: { ...state.shares, [share.id]: share },
        })),
      getShare: (id) => get().shares[id],
    }),
    {
      name: 'memorybase-shares',
    }
  )
);
