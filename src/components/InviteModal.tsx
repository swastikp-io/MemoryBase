import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: { fullName: string; email: string }) => void;
}

export const InviteModal: React.FC<InviteModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (!fullName.trim() || !email.trim() || !inviteCode.trim()) {
        throw new Error('Please fill out all fields.');
      }

      // Verify the invite code from Supabase
      const { data, error: sbError } = await supabase
        .from('early_access_users')
        .select('*')
        .eq('invite_code', inviteCode)
        .single();

      if (sbError || !data) {
        throw new Error('Invalid or expired invite code.');
      }

      if (data.email) {
        throw new Error('This invite code has already been claimed.');
      }

      // Claim the invite code by updating the row
      const { error: updateError } = await supabase
        .from('early_access_users')
        .update({ name: fullName, email })
        .eq('invite_code', inviteCode);

      if (updateError) {
        console.error('Error claiming invite code:', updateError);
        throw new Error('Failed to register user. Please try again.');
      }

      onSuccess({ fullName, email });
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
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
                <h2 className="text-xl font-bold font-sans tracking-tight text-[var(--textPrimary)]">Request Access</h2>
                <button
                  onClick={onClose}
                  className="p-1.5 text-[var(--textSecondary)] hover:bg-[var(--surfaceSecondary)] hover:text-[var(--textPrimary)] rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
                {error && (
                  <div className="p-3 rounded-lg bg-[var(--error)]/10 border border-[var(--error)]/20 text-[var(--error)] text-sm font-medium">
                    {error}
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="fullName" className="text-sm font-medium text-[var(--textSecondary)]">Full Name</label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--textPrimary)] placeholder:text-[var(--textSecondary)]/50 focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
                    required
                  />
                </div>

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
                  <label htmlFor="inviteCode" className="text-sm font-medium text-[var(--textSecondary)]">Invite Code</label>
                  <input
                    id="inviteCode"
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="EARLY-ACCESS-2026"
                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--textPrimary)] placeholder:text-[var(--textSecondary)]/50 focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all font-mono uppercase"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="mt-2 w-full bg-[var(--textPrimary)] text-[var(--background)] hover:opacity-90 disabled:opacity-50 h-12 rounded-full font-medium flex items-center justify-center gap-2 transition-opacity"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>Verify & Access <ArrowRight className="w-4 h-4" /></>
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
