import { create } from 'zustand';
import { useAuthStore } from './auth';

export interface ReasoningPhase {
  status: string;
  step?: string;
  plan?: string;
  isComplete: boolean;
}

export type ResearchStatus = "planning" | "running" | "completed" | "cancelled" | "failed";

export interface ResearchStep {
  id: string;
  title: string;
  status: "pending" | "running" | "completed" | "failed";
}

export interface ResearchEvent {
  id: string;
  timestamp: number;
  message: string;
}

export interface ResearchSession {
  id: string;
  title: string;
  status: ResearchStatus;
  progress: number;
  steps: ResearchStep[];
  events: ResearchEvent[];
  startedAt?: number;
  completedAt?: number;
}

export interface Message {
  id: string;
  role: "user" | "model" | "system";
  content: string;
  createdAt?: string;
  images?: string[];
  isSearchingWeb?: boolean;
  memoryTraceId?: string;
  reasoning?: ReasoningPhase;
  research?: ResearchSession;
  webSearchUsed?: boolean;
  sources?: Array<{ title: string; url: string; snippet?: string }>;
}

export interface ChatSession {
  id: string;
  title: string;
  updatedAt: string;
  mode?: string;
}

interface ChatStore {
  chats: ChatSession[];
  activeChatId: string | null;
  messages: Message[];
  isLoadingChats: boolean;
  isLoadingMessages: boolean;
  webSearchEnabled: boolean;

  toggleWebSearch: () => void;
  setWebSearch: (enabled: boolean) => void;

  loadChats: () => Promise<void>;
  loadChat: (id: string) => Promise<void>;
  createChat: (mode?: string) => Promise<string | null>;
  deleteChat: (id: string) => Promise<void>;
  renameChat: (id: string, newTitle: string) => Promise<void>;
  updateChatMode: (id: string, mode: string) => Promise<void>;
  addMessageOptimistic: (msg: Message) => void;
  saveMessage: (chatId: string, role: string, content: string, webSearchUsed?: boolean) => Promise<string | null>;
  updateMessageContent: (messageId: string, content: string, append?: boolean, isSearchingWeb?: boolean, memoryTraceId?: string, reasoning?: any, research?: any, sources?: any[]) => void;
  clearState: () => void;
}

/**
 * fetchWithAuth — Uses the Supabase access token from the auth store
 * to authenticate requests to the Express backend.
 */
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = useAuthStore.getState().token;
  if (!token) throw new Error('No auth token available');
  
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

export const useChatStore = create<ChatStore>((set, get) => ({
  chats: [],
  activeChatId: null,
  messages: [],
  isLoadingChats: false,
  isLoadingMessages: false,
  webSearchEnabled: typeof window !== 'undefined' ? localStorage.getItem('webSearchEnabled') === 'true' : false,

  toggleWebSearch: () => set((state) => {
    const newState = !state.webSearchEnabled;
    if (typeof window !== 'undefined') localStorage.setItem('webSearchEnabled', String(newState));
    return { webSearchEnabled: newState };
  }),

  setWebSearch: (enabled) => set(() => {
    if (typeof window !== 'undefined') localStorage.setItem('webSearchEnabled', String(enabled));
    return { webSearchEnabled: enabled };
  }),

  loadChats: async () => {
    set({ isLoadingChats: true });
    try {
      const data = await fetchWithAuth('/api/chats');
      set({ chats: data, isLoadingChats: false });
    } catch (e) {
      console.error('Failed to load chats', e);
      set({ isLoadingChats: false });
    }
  },

  loadChat: async (id: string) => {
    set({ activeChatId: id, isLoadingMessages: true, messages: [] });
    try {
      const msgs = await fetchWithAuth(`/api/chats/${id}/messages`);
      set({ messages: msgs, isLoadingMessages: false });
    } catch (e) {
      console.error('Failed to load messages', e);
      set({ isLoadingMessages: false });
    }
  },

  createChat: async (mode = 'standard') => {
    try {
      const data = await fetchWithAuth('/api/chats', {
        method: 'POST',
        body: JSON.stringify({ title: 'New Chat', model: mode })
      });
      await get().loadChats();
      set({ activeChatId: data.chatId, messages: [] });
      return data.chatId;
    } catch (e) {
      console.error('Failed to create chat', e);
      return null;
    }
  },

  deleteChat: async (id: string) => {
    const previousChats = get().chats;
    const previousActiveId = get().activeChatId;
    
    // Optimistic UI update
    const newChats = previousChats.filter(c => c.id !== id);
    set({ chats: newChats });
    
    if (previousActiveId === id) {
      if (newChats.length > 0) {
        // Optimistically load the next chat
        get().loadChat(newChats[0].id);
      } else {
        set({ activeChatId: null, messages: [] });
      }
    }

    try {
      await fetchWithAuth(`/api/chats/${id}`, { method: 'DELETE' });
      // Keep optimistic update, just refetch to ensure sync
      await get().loadChats();
    } catch (e) {
      console.error('Failed to delete chat', e);
      // Revert optimistic update
      set({ chats: previousChats });
      if (previousActiveId === id) {
        get().loadChat(previousActiveId);
      }
      throw e;
    }
  },

  renameChat: async (id: string, title: string) => {
    try {
      await fetchWithAuth(`/api/chats/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title })
      });
      await get().loadChats();
    } catch (e) {
      console.error('Failed to rename chat', e);
    }
  },

  updateChatMode: async (id: string, mode: string) => {
    try {
      await fetchWithAuth(`/api/chats/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ mode })
      });
      await get().loadChats();
    } catch (e) {
      console.error('Failed to update chat mode', e);
    }
  },

  addMessageOptimistic: (msg: Message) => {
    set(state => ({ messages: [...state.messages, msg] }));
  },

  updateMessageContent: (messageId, content, append = false, isSearchingWeb, memoryTraceId, reasoning, research, sources) => {
    set(state => ({
      messages: state.messages.map(m => 
        m.id === messageId ? {
          ...m,
          content: append ? m.content + content : content,
          ...(isSearchingWeb !== undefined ? { isSearchingWeb } : {}),
          ...(memoryTraceId !== undefined ? { memoryTraceId } : {}),
          ...(reasoning !== undefined ? { reasoning: { ...m.reasoning, ...reasoning } } : {}),
          ...(research !== undefined ? { research: { ...m.research, ...research } } : {}),
          ...(sources !== undefined ? { sources } : {})
        } : m
      )
    }));
  },

  saveMessage: async (chatId, role, content, webSearchUsed) => {
    try {
      const data = await fetchWithAuth('/api/messages', {
        method: 'POST',
        body: JSON.stringify({ chatId, role, content, webSearchUsed })
      });
      return data.messageId;
    } catch (e) {
      console.error('Failed to save message', e);
      return null;
    }
  },

  clearState: () => {
    set({ chats: [], activeChatId: null, messages: [] });
  }
}));
