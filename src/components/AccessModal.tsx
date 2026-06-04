import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Key } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useSettingsStore } from '../store/settings';

interface AccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccessModal: React.FC<AccessModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setInviteCode('');
      setErrorMsg('');
    }
  }, [isOpen]);

  const handleAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsVerifying(true);

    try {
      const { data: isValid, error } = await supabase.rpc('verify_invite_code', {
        p_email: email.trim(),
        p_code: inviteCode.trim()
      });

      if (error) {
        console.error('Invite verification error:', error);
        setErrorMsg('Error verifying code. Please try again.');
        setIsVerifying(false);
        return;
      }

      if (isValid) {
        localStorage.setItem('paralex_early_access', 'true');
        localStorage.setItem('paralex_user_email', email.trim());
        useSettingsStore.getState().updateProfile({ email: email.trim() });
        onClose();
        navigate('/chat');
      } else {
        setErrorMsg('Invalid email or invite code.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('An unexpected error occurred.');
    } finally {
      setIsVerifying(false);
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
            className="relative bg-[#1a1a1a] border border-[#333] rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
          >
            <div className="p-6 md:p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-semibold text-white">
                  Access Paralex
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAccess} className="space-y-4">
                <div>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email address"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-[#222] border border-[#333] rounded-xl focus:ring-2 focus:ring-[#10A37F] focus:border-transparent outline-none transition-all text-white placeholder:text-gray-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      placeholder="Invite Code"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-[#222] border border-[#333] rounded-xl focus:ring-2 focus:ring-[#10A37F] focus:border-transparent outline-none transition-all text-white placeholder:text-gray-500"
                    />
                  </div>
                </div>

                {errorMsg && (
                  <p className="text-sm text-red-500 font-medium">
                    {errorMsg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isVerifying}
                  className="w-full bg-[#10A37F] text-white rounded-xl px-4 py-3 font-medium hover:bg-[#10A37F]/90 disabled:opacity-70 disabled:cursor-not-allowed transition-colors mt-6"
                >
                  {isVerifying ? 'Verifying...' : 'Access Paralex'}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
