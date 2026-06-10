import { create } from 'zustand';
import { persist } from 'zustand/middleware';



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
  appearance: {
    themeMode: 'light' | 'dark';
    themePreset: string;
    lightTheme: string;
    darkTheme: string;
  };

  aiBehavior: {
    defaultModel: string;
  };
  privacy: {
    chatHistory: boolean;
    trainingDataOptOut: boolean;
  };


  updateProfile: (data: Partial<SettingsState['profile']>) => void;
  updatePersonalization: (data: Partial<SettingsState['personalization']>) => void;
  updateAiBehavior: (data: Partial<SettingsState['aiBehavior']>) => void;
  updatePrivacy: (data: Partial<SettingsState['privacy']>) => void;

  updateAppearance: (data: Partial<SettingsState['appearance']>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
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
        themeMode: 'light',
        themePreset: 'codex',
        lightTheme: 'codex',
        darkTheme: 'default',
      },

      updateProfile: (data) =>
        set((state) => ({ profile: { ...state.profile, ...data } })),
      updatePersonalization: (data) =>
        set((state) => {
          const newPersonalization = { ...state.personalization, ...data };

          // Sync changes to backend API dynamically
          const userId = 'guest';
          fetch(`/api/settings/personalization/${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              aboutUser: newPersonalization.instructionsAbout,
              responseStyle: newPersonalization.instructionsRespond,
            })
          }).catch(console.error);

          return { personalization: newPersonalization };
        }),
      updateAiBehavior: (data) =>
        set((state) => {
          const newBehavior = { ...state.aiBehavior, ...data };
          return { aiBehavior: newBehavior };
        }),
      updatePrivacy: (data) =>
        set((state) => ({ privacy: { ...state.privacy, ...data } })),

      updateAppearance: (data) =>
        set((state) => ({ appearance: { ...state.appearance, ...data } })),
    }),
    {
      name: 'paralex-settings',
    }
  )
);
