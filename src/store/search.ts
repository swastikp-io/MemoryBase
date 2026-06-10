import { create } from 'zustand';

interface SearchStore {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  query: string;
  setQuery: (query: string) => void;
}

export const useSearchStore = create<SearchStore>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false, query: '' }),
  query: '',
  setQuery: (query) => set({ query }),
}));
