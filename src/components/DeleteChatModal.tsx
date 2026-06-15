import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertTriangle } from 'lucide-react';

interface DeleteChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

export const DeleteChatModal: React.FC<DeleteChatModalProps> = ({ isOpen, onClose, onConfirm, isDeleting }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            onClick={isDeleting ? undefined : onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-[101] p-6"
          >
            <div className="bg-[var(--background)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
              <div className="flex items-center gap-3 p-6 border-b border-[var(--border)]">
                <div className="p-2 rounded-full bg-red-500/10 text-red-500">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold font-sans tracking-tight text-[var(--textPrimary)]">
                  Delete Conversation?
                </h2>
                <button
                  onClick={onClose}
                  disabled={isDeleting}
                  className="ml-auto p-1.5 text-[var(--textSecondary)] hover:bg-[var(--surfaceSecondary)] hover:text-[var(--textPrimary)] rounded-full transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6">
                <p className="text-[var(--textSecondary)] text-[15px] leading-relaxed">
                  This conversation and all messages inside it will be permanently removed.
                </p>
              </div>

              <div className="p-6 pt-2 flex gap-3 justify-end">
                <button
                  onClick={onClose}
                  disabled={isDeleting}
                  className="px-5 py-2.5 rounded-full font-medium text-[var(--textPrimary)] bg-[var(--surfaceSecondary)] hover:bg-[var(--surface)] transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isDeleting}
                  className="px-5 py-2.5 rounded-full font-medium text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
