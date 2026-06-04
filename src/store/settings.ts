import { create } from 'zustand';
import { persist } from 'zustand/middleware';

let apiKeySyncTimeout: ReturnType<typeof setTimeout> | null = null;

export interface SettingsState {
  profile: {
    displayName: string;
    username: string;
    bio: string;
    email: string;
  };
  personalization: {
    instructionsAbout: string;
    instructionsRespond: string;
    tone: string[];
    preferredFormat: string[];
  };

  aiBehavior: {
    defaultModel: string;
    openRouterApiKey: string;
    keySyncStatus?: 'idle' | 'saving' | 'saved' | 'error';
  };
  privacy: {
    chatHistory: boolean;
    trainingDataOptOut: boolean;
  };
  voiceExperience: {
    autoSendSpeech: boolean;
    autoSpeakAI: boolean;
    streamingVoice: boolean;
    keepVoiceMode: boolean;
  };

  updateProfile: (data: Partial<SettingsState['profile']>) => void;
  updatePersonalization: (data: Partial<SettingsState['personalization']>) => void;
  updateAiBehavior: (data: Partial<SettingsState['aiBehavior']>) => void;
  updatePrivacy: (data: Partial<SettingsState['privacy']>) => void;
  updateVoiceExperience: (data: Partial<SettingsState['voiceExperience']>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      profile: {
        displayName: 'Guest User',
        username: 'guest',
        bio: '',
        email: '',
      },
      personalization: {
        instructionsAbout: '',
        instructionsRespond: '',
        tone: ['Professional', 'Conversational'],
        preferredFormat: ['Markdown', 'Code Blocks'],
      },
      aiBehavior: {
        defaultModel: 'openrouter/free',
        openRouterApiKey: '',
        keySyncStatus: 'idle',
      },
      privacy: {
        chatHistory: true,
        trainingDataOptOut: false,
      },
      voiceExperience: {
        autoSendSpeech: true,
        autoSpeakAI: true,
        streamingVoice: true,
        keepVoiceMode: true,
      },

      updateProfile: (data) =>
        set((state) => ({ profile: { ...state.profile, ...data } })),
      updatePersonalization: (data) =>
        set((state) => {
          const newPersonalization = { ...state.personalization, ...data };

          // Sync changes to backend API dynamically
          import('../lib/supabase').then(({ supabase }) => {
            supabase.auth.getUser().then(({ data: authData }) => {
              const userId = authData.user ? authData.user.id : 'guest';
              fetch(`/api/settings/personalization/${userId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  aboutUser: newPersonalization.instructionsAbout,
                  responseStyle: newPersonalization.instructionsRespond,
                })
              }).catch(console.error);
            });
          });

          return { personalization: newPersonalization };
        }),
      updateAiBehavior: (data) =>
        set((state) => {
          const newBehavior = { ...state.aiBehavior, ...data };

          if (data.openRouterApiKey !== undefined) {
            newBehavior.keySyncStatus = 'saving';
            if (apiKeySyncTimeout) clearTimeout(apiKeySyncTimeout);
            apiKeySyncTimeout = setTimeout(() => {
              import('../lib/supabase').then(({ supabase }) => {
                const earlyAccessEmail = localStorage.getItem('paralex_user_email');

                supabase.auth.getUser().then(async ({ data: authData }) => {
                  let success = false;
                  
                  // 1. If logged in via Supabase Auth, update profiles table
                  if (authData?.user) {
                    const { error } = await supabase.from('profiles').update({
                      openrouter_api_key: data.openRouterApiKey
                    }).eq('id', authData.user.id);
                    if (!error) success = true;
                  }

                  // 2. If early access user, update early_access_invites table
                  if (earlyAccessEmail) {
                    const { error } = await supabase.rpc('update_openrouter_key', {
                      p_email: earlyAccessEmail,
                      p_key: data.openRouterApiKey
                    });
                    if (!error) success = true;
                    if (error) console.error('Failed to sync OPEN_ROUTER_KEY to early access table:', error);
                  }

                  if (success) {
                    set((state) => ({ aiBehavior: { ...state.aiBehavior, keySyncStatus: 'saved' } }));
                    setTimeout(() => {
                      set((state) => ({ aiBehavior: { ...state.aiBehavior, keySyncStatus: 'idle' } }));
                    }, 2000);
                  } else {
                    set((state) => ({ aiBehavior: { ...state.aiBehavior, keySyncStatus: 'error' } }));
                  }
                });
              });
            }, 1000);
          }

          return { aiBehavior: newBehavior };
        }),
      updatePrivacy: (data) =>
        set((state) => ({ privacy: { ...state.privacy, ...data } })),
      updateVoiceExperience: (data) =>
        set((state) => ({ voiceExperience: { ...state.voiceExperience, ...data } })),
    }),
    {
      name: 'paralex-settings',
    }
  )
);
