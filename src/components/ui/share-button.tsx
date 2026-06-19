import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Share2, Check } from 'lucide-react';

export interface ShareButtonProps {
  size?: 'sm' | 'md' | 'lg';
  icon?: boolean;
  contentToShare?: string;
  children?: React.ReactNode;
}

export const ShareButton: React.FC<ShareButtonProps> = ({ 
  size = 'sm', 
  icon = true, 
  contentToShare = "", 
  children 
}) => {
  const [isShared, setIsShared] = useState(false);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Shared from MemoryBase',
          text: contentToShare,
        });
        setIsShared(true);
        setTimeout(() => setIsShared(false), 2000);
      } catch (err) {
        console.error('Share failed:', err);
        // Fallback to clipboard
        navigator.clipboard.writeText(contentToShare);
        setIsShared(true);
        setTimeout(() => setIsShared(false), 2000);
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(contentToShare);
      setIsShared(true);
      setTimeout(() => setIsShared(false), 2000);
    }
  };

  const sizeClasses = {
    sm: 'p-1.5 text-xs',
    md: 'p-2 text-sm',
    lg: 'p-3 text-base'
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleShare}
      className={`flex items-center gap-1.5 text-text-secondary hover:text-text-primary hover:bg-[var(--surfaceSecondary)] rounded-md transition-colors ${sizeClasses[size]}`}
      title="Share"
    >
      <AnimatePresence mode="wait">
        {isShared ? (
          <motion.div
            key="check"
            initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.5, rotate: 90 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <Check className="w-4 h-4 text-green-600" />
          </motion.div>
        ) : (
          <motion.div
            key="share"
            initial={{ opacity: 0, scale: 0.5, rotate: 90 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.5, rotate: -90 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            {icon && <Share2 className="w-4 h-4" />}
          </motion.div>
        )}
      </AnimatePresence>
      {isShared ? (
        <span className="text-green-600 font-medium">Shared!</span>
      ) : (
        children && <span>{children}</span>
      )}
    </motion.button>
  );
};
