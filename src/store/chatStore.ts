import { create } from 'zustand';
import { ReasoningStep } from './reasoningStore';

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
  role: "user" | "model" | "system" | "assistant";
  content: string;
  createdAt?: string;
  images?: string[];
  isSearchingWeb?: boolean;
  reasoning?: ReasoningPhase;
  research?: ResearchSession;
  webSearchUsed?: boolean;
  sources?: Array<{ title: string; url: string; snippet?: string }>;
  reasoningSteps?: ReasoningStep[];
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
  updateMessageContent: (messageId: string, content: string, append?: boolean, isSearchingWeb?: boolean, reasoning?: any, research?: any, sources?: any[], reasoningSteps?: ReasoningStep[]) => void;
  clearState: () => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  chats: [],
  activeChatId: null,
  messages: [],
  isLoadingChats: false,
  isLoadingMessages: false,
  webSearchEnabled: false,

  toggleWebSearch: () => set((state) => ({ webSearchEnabled: !state.webSearchEnabled })),

  setWebSearch: (enabled) => set(() => ({ webSearchEnabled: enabled })),

  loadChats: async () => {
    // No-op for volatile state
    set({ isLoadingChats: false });
  },

  loadChat: async (id: string) => {
    // We don't fetch from backend. Keep current messages if activeChatId matches, otherwise reset.
    if (get().activeChatId !== id) {
      set({ activeChatId: id, messages: [] });
    }
  },

  createChat: async (mode = 'standard') => {
    const newId = crypto.randomUUID();
    const newChat: ChatSession = {
      id: newId,
      title: 'New Chat',
      updatedAt: new Date().toISOString(),
      mode
    };
    set((state) => ({ 
      chats: [newChat, ...state.chats],
      activeChatId: newId,
      messages: []
    }));
    return newId;
  },

  deleteChat: async (id: string) => {
    set((state) => {
      const newChats = state.chats.filter((c) => c.id !== id);
      const isDeletingActive = state.activeChatId === id;
      return {
        chats: newChats,
        activeChatId: isDeletingActive ? (newChats.length > 0 ? newChats[0].id : null) : state.activeChatId,
        messages: isDeletingActive && newChats.length === 0 ? [] : state.messages
      };
    });
  },

  renameChat: async (id: string, title: string) => {
    set((state) => ({
      chats: state.chats.map((c) => (c.id === id ? { ...c, title } : c))
    }));
  },

  updateChatMode: async (id: string, mode: string) => {
    set((state) => ({
      chats: state.chats.map((c) => (c.id === id ? { ...c, mode } : c))
    }));
  },

  addMessageOptimistic: (msg: Message) => {
    set((state) => ({ messages: [...state.messages, msg] }));
  },

  updateMessageContent: (messageId, content, append = false, isSearchingWeb, reasoning, research, sources, reasoningSteps) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? {
          ...m,
          content: append ? m.content + content : content,
          ...(isSearchingWeb !== undefined ? { isSearchingWeb } : {}),
          ...(reasoning !== undefined ? { reasoning: { ...m.reasoning, ...reasoning } } : {}),
          ...(research !== undefined ? { research: { ...m.research, ...research } } : {}),
          ...(sources !== undefined ? { sources } : {}),
          ...(reasoningSteps !== undefined ? { reasoningSteps } : {})
        } : m
      )
    }));
  },

  saveMessage: async (chatId, role, content, webSearchUsed) => {
    // Generate an ID instantly since it's volatile
    const messageId = crypto.randomUUID();
    return messageId;
  },

  clearState: () => {
    set({ chats: [], activeChatId: null, messages: [] });
  }
}));
