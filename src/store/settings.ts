import { create } from 'zustand';

export interface SettingsState {
  profile: {
    displayName: string;
    bio: string;
  };
  personalization: {
    instructionsAbout: string;
    instructionsRespond: string;
    tone: string[];
    preferredFormat: string[];
  };


  aiBehavior: {
    defaultModel: string;
  };
  privacy: {
    chatHistory: boolean;
    trainingDataOptOut: boolean;
  };
  appearance: {
    theme: 'light' | 'dark' | 'system';
  };

  updateProfile: (data: Partial<SettingsState['profile']>) => void;
  updatePersonalization: (data: Partial<SettingsState['personalization']>) => void;
  updateAiBehavior: (data: Partial<SettingsState['aiBehavior']>) => void;
  updatePrivacy: (data: Partial<SettingsState['privacy']>) => void;
  updateAppearance: (data: Partial<SettingsState['appearance']>) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  profile: {
    displayName: 'Guest User',
    bio: '',
  },
  personalization: {
    instructionsAbout: '',
    instructionsRespond: '',
    tone: ['Professional', 'Conversational'],
    preferredFormat: ['Markdown', 'Code Blocks'],
  },
  aiBehavior: {
    defaultModel: 'openrouter/free',
  },
  privacy: {
    chatHistory: true,
    trainingDataOptOut: false,
  },
  appearance: {
    theme: 'light',
  },


  updateProfile: (data) =>
    set((state) => ({ profile: { ...state.profile, ...data } })),
  updatePersonalization: (data) =>
    set((state) => ({ personalization: { ...state.personalization, ...data } })),
  updateAiBehavior: (data) =>
    set((state) => ({ aiBehavior: { ...state.aiBehavior, ...data } })),
  updatePrivacy: (data) =>
    set((state) => ({ privacy: { ...state.privacy, ...data } })),
  updateAppearance: (data) =>
    set((state) => ({ appearance: { ...state.appearance, ...data } })),
}));
