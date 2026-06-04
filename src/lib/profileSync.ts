import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { useSettingsStore } from '../store/settings';

function getGitHubDisplayName(user: User) {
  const metadata = user.user_metadata ?? {};
  return metadata.full_name || metadata.name || metadata.user_name || metadata.preferred_username || user.email || 'GitHub User';
}

function getGitHubUsername(user: User) {
  const metadata = user.user_metadata ?? {};
  return metadata.user_name || metadata.preferred_username || metadata.name || user.email?.split('@')[0] || 'github-user';
}

function getGitHubAvatarUrl(user: User) {
  const metadata = user.user_metadata ?? {};
  return metadata.avatar_url || metadata.picture || null;
}

export async function syncProfileFromSupabaseUser(user: User | null | undefined) {
  if (!user) {
    const earlyAccessEmail = localStorage.getItem('paralex_user_email');
    if (earlyAccessEmail) {
      const username = earlyAccessEmail.split('@')[0];
      
      useSettingsStore.getState().updateProfile({
        displayName: username,
        username: username,
        email: earlyAccessEmail,
      });

      const { data: invite } = await supabase
        .from('early_access_invites')
        .select('OPEN_ROUTER_KEY')
        .eq('email', earlyAccessEmail)
        .single();

      if (invite && invite.OPEN_ROUTER_KEY) {
        useSettingsStore.getState().updateAiBehavior({
          openRouterApiKey: invite.OPEN_ROUTER_KEY
        });
      }
    } else {
      useSettingsStore.getState().updateProfile({
        displayName: 'Guest User',
        username: 'guest',
        email: '',
      });
    }
    return;
  }

  useSettingsStore.getState().updateProfile({
    displayName: getGitHubDisplayName(user),
    username: getGitHubUsername(user),
    email: user.email ?? '',
  });

  const { data: profile } = await supabase
    .from('profiles')
    .select('openrouter_api_key')
    .eq('id', user.id)
    .single();

  if (profile && profile.openrouter_api_key) {
    useSettingsStore.getState().updateAiBehavior({
      openRouterApiKey: profile.openrouter_api_key
    });
  }
}

export async function upsertProfileFromSupabaseUser(user: User | null | undefined) {
  if (!user) {
    return;
  }

  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      full_name: getGitHubDisplayName(user),
      email: user.email ?? null,
      avatar_url: getGitHubAvatarUrl(user),
      github_username: getGitHubUsername(user),
    }, {
      onConflict: 'id',
    });

  if (error) {
    throw error;
  }
}
