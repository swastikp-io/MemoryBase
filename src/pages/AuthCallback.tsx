import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { syncProfileFromSupabaseUser, upsertProfileFromSupabaseUser } from '../lib/profileSync';

export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState('Finishing sign in...');

  useEffect(() => {
    let isMounted = true;

    const completeSignIn = async () => {
      const authCode = new URLSearchParams(window.location.search).get('code');
      const callbackError = new URLSearchParams(window.location.search).get('error_description');
      const hashError = new URLSearchParams(window.location.hash.slice(1)).get('error_description');

      if (callbackError || hashError) {
        setMessage(callbackError ?? hashError ?? 'Unable to finish sign in. Please try again.');
        return;
      }

      let result;
      if (authCode) {
        result = await supabase.auth.exchangeCodeForSession(authCode);
      } else {
        result = await supabase.auth.getSession();
      }

      const { data, error } = result;

      if (!isMounted) {
        return;
      }

      if (error || !data?.session) {
        setMessage(error?.message ?? 'Unable to finish sign in. Please try again.');
        return;
      }

      syncProfileFromSupabaseUser(data.session.user);
      try {
        await upsertProfileFromSupabaseUser(data.session.user);
      } catch (profileError: any) {
        setMessage(profileError?.message ?? 'Unable to save your profile. Please try again.');
        return;
      }

      if (window.location.hash || window.location.search) {
        window.history.replaceState({}, document.title, '/auth/callback');
      }

      navigate('/chat', { replace: true });
    };

    completeSignIn();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex items-center justify-center px-6">
      <div className="text-center">
        <p className="text-base font-medium">{message}</p>
      </div>
    </div>
  );
};
