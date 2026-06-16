import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, ArrowRight } from 'lucide-react';
import {
  signUpWithEmail,
  signInWithEmail,
  signInWithGitHub,
} from '../lib/auth-service';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGitHubLoading, setIsGitHubLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (!email.trim() || !password.trim() || (!isLogin && !fullName.trim())) {
        throw new Error('Please fill in all fields.');
      }

      if (isLogin) {
        const { error } = await signInWithEmail(email, password);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await signUpWithEmail(email, password, fullName);
        if (error) throw new Error(error.message);
      }

      // Auth state change listener in the auth store will handle the rest
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGitHubLogin = async () => {
    setError(null);
    setIsGitHubLoading(true);

    try {
      const { error } = await signInWithGitHub();
      if (error) throw new Error(error.message);
      // OAuth flow will redirect to GitHub and back
    } catch (err: any) {
      setError(err.message || 'GitHub login failed.');
      setIsGitHubLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-[101] p-6"
          >
            <div className="bg-[var(--background)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
              <div className="flex justify-between items-center p-6 border-b border-[var(--border)]">
                <h2 className="text-xl font-bold font-sans tracking-tight text-[var(--textPrimary)]">
                  {isLogin ? 'Login to MemoryBase' : 'Create Account'}
                </h2>
                <button
                  onClick={onClose}
                  className="p-1.5 text-[var(--textSecondary)] hover:bg-[var(--surfaceSecondary)] hover:text-[var(--textPrimary)] rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex px-6 pt-6 gap-4">
                <button 
                  onClick={() => setIsLogin(true)}
                  className={`flex-1 pb-2 border-b-2 font-medium transition-colors ${isLogin ? 'border-[var(--accent)] text-[var(--textPrimary)]' : 'border-transparent text-[var(--textSecondary)] hover:text-[var(--textPrimary)]'}`}
                >
                  Login
                </button>
                <button 
                  onClick={() => setIsLogin(false)}
                  className={`flex-1 pb-2 border-b-2 font-medium transition-colors ${!isLogin ? 'border-[var(--accent)] text-[var(--textPrimary)]' : 'border-transparent text-[var(--textSecondary)] hover:text-[var(--textPrimary)]'}`}
                >
                  Register
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
                {error && (
                  <div className="p-3 rounded-lg bg-[var(--error)]/10 border border-[var(--error)]/20 text-[var(--error)] text-sm font-medium">
                    {error}
                  </div>
                )}

                {/* GitHub OAuth Button */}
                <button
                  type="button"
                  onClick={handleGitHubLogin}
                  disabled={isGitHubLoading || isLoading}
                  className="w-full bg-[#24292f] hover:bg-[#1b1f23] disabled:opacity-50 text-white h-12 rounded-full font-medium flex items-center justify-center gap-3 transition-colors"
                >
                  {isGitHubLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                      </svg>
                      Continue with GitHub
                    </>
                  )}
                </button>

                <div className="flex items-center gap-4">
                  <div className="flex-1 h-px bg-[var(--border)]"></div>
                  <span className="text-xs text-[var(--textSecondary)] font-medium">or</span>
                  <div className="flex-1 h-px bg-[var(--border)]"></div>
                </div>

                {!isLogin && (
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="fullName" className="text-sm font-medium text-[var(--textSecondary)]">Full Name</label>
                    <input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--textPrimary)] placeholder:text-[var(--textSecondary)]/50 focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
                      required={!isLogin}
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email" className="text-sm font-medium text-[var(--textSecondary)]">Email Address</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--textPrimary)] placeholder:text-[var(--textSecondary)]/50 focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="password" className="text-sm font-medium text-[var(--textSecondary)]">Password</label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--textPrimary)] placeholder:text-[var(--textSecondary)]/50 focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || isGitHubLoading}
                  className="mt-2 w-full bg-[var(--textPrimary)] text-[var(--background)] hover:opacity-90 disabled:opacity-50 h-12 rounded-full font-medium flex items-center justify-center gap-2 transition-opacity"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>{isLogin ? 'Login' : 'Create Account'} <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
