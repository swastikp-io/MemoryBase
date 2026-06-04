import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'register'
}) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const siteUrl = import.meta.env.VITE_APP_URL ?? window.location.origin ?? 'https://paralexai-main.vercel.app';

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setAuthError(null);
      setAuthSuccess(null);
      setFullName('');
      setEmail('');
      setPassword('');
    }
  }, [isOpen, initialMode]);

  const handleGitHubAuth = async () => {
    setAuthError(null);
    setAuthSuccess(null);
    setIsAuthenticating(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: siteUrl,
      },
    });

    if (error) {
      setAuthError(error.message);
      setIsAuthenticating(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    setIsAuthenticating(true);

    try {
      if (mode === 'register') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
            emailRedirectTo: siteUrl,
          }
        });

        if (error) throw error;
        setAuthSuccess("Registration successful! Please check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        onClose(); // Close modal on successful login
        navigate('/chat');
      }
    } catch (error: any) {
      setAuthError(error.message || "Authentication failed");
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
          >
            <div className="p-6 md:p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-semibold text-black">
                  {mode === 'login' ? 'Log in' : 'Create an account'}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {authSuccess ? (
                <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-100">
                  <p className="text-sm text-green-700 text-center font-medium">
                    {authSuccess}
                  </p>
                  <button
                    onClick={() => {
                      setMode('login');
                      setAuthSuccess(null);
                    }}
                    className="mt-4 w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Go to Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
                  {mode === 'register' && (
                    <div>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-black" />
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Full Name"
                          required
                          className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all text-black placeholder:text-gray-500"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-black" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email address"
                        required
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all text-black placeholder:text-gray-500"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-black" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        required
                        minLength={6}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all text-black placeholder:text-gray-500"
                      />
                    </div>
                  </div>

                  {authError && (
                    <p className="text-sm text-red-600">
                      {authError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isAuthenticating}
                    className="w-full bg-black text-white rounded-xl px-4 py-3 font-medium hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-75 transition-colors"
                  >
                    {isAuthenticating ? 'Processing...' : (mode === 'login' ? 'Log in with Email' : 'Sign up with Email')}
                  </button>
                </form>
              )}

              {!authSuccess && (
                <>
                  <div className="relative flex items-center gap-4 py-2">
                    <div className="h-px flex-1 bg-gray-200"></div>
                    <span className="text-sm text-gray-400 font-medium">OR</span>
                    <div className="h-px flex-1 bg-gray-200"></div>
                  </div>

                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={handleGitHubAuth}
                      disabled={isAuthenticating}
                      className="w-full flex items-center justify-center gap-3 bg-[#24292F] text-white rounded-xl px-4 py-3.5 font-medium hover:bg-[#24292F]/90 disabled:cursor-not-allowed disabled:opacity-75 transition-colors"
                    >
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.379.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                      </svg>
                      <span>{isAuthenticating ? 'Redirecting...' : `${mode === 'login' ? 'Log in' : 'Sign up'} with GitHub`}</span>
                    </button>
                  </div>
                </>
              )}

              <div className="mt-8 text-center text-sm text-gray-500">
                {mode === 'login' ? (
                  <p>
                    Don't have an account?{' '}
                    <button
                      onClick={() => setMode('register')}
                      className="text-black font-semibold hover:underline"
                    >
                      Sign up
                    </button>
                  </p>
                ) : (
                  <p>
                    Already have an account?{' '}
                    <button
                      onClick={() => setMode('login')}
                      className="text-black font-semibold hover:underline"
                    >
                      Log in
                    </button>
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

