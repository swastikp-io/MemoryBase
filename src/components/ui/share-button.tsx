import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Share2, Link as LinkIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { Tooltip } from './tooltip';
import { useToast } from './toast';
import { useChatStore } from '../../store/chatStore';
import { useShareStore } from '../../store/shareStore';
import { IconBrandX, IconBrandLinkedin, IconBrandReddit } from '@tabler/icons-react';

export interface ShareButtonProps {
  size?: 'sm' | 'md' | 'lg';
  icon?: boolean;
  contentToShare?: string;
  messageId?: string;
}

export const ShareButton: React.FC<ShareButtonProps> = ({ 
  size = 'sm', 
  icon = true, 
  contentToShare = "", 
  messageId
}) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  
  const activeChatId = useChatStore((s) => s.activeChatId);
  const messages = useChatStore((s) => s.messages);
  const updateMessageShareId = useChatStore((s) => s.updateMessageShareId);
  const createShare = useShareStore((s) => s.createShare);

  const getPublicShareUrl = () => {
    if (!messageId || !activeChatId) return null;
    
    const message = messages.find(m => m.id === messageId);
    if (!message) return null;

    let shareId = message.publicShareId;
    if (!shareId) {
      shareId = crypto.randomUUID();
      updateMessageShareId(messageId, shareId);
      
      createShare({
        id: shareId,
        conversationId: activeChatId,
        message: { ...message, publicShareId: shareId },
        createdAt: new Date().toISOString(),
        ownerId: "local-user",
        visibility: "public"
      });
    }
    
    return `${window.location.origin}/share/${shareId}`;
  };

  const handleCopyLink = () => {
    const url = getPublicShareUrl();
    if (url) {
      navigator.clipboard.writeText(url).then(() => {
        toast("Link copied");
      }).catch(err => {
        console.error("Failed to copy:", err);
      });
    }
    setIsOpen(false);
  };

  const handleShareX = () => {
    const url = getPublicShareUrl();
    if (url) {
      window.open(`https://twitter.com/intent/tweet?text=Shared from MemoryBase&url=${encodeURIComponent(url)}`, '_blank', 'noopener,noreferrer');
    }
    setIsOpen(false);
  };

  const handleShareLinkedIn = () => {
    const url = getPublicShareUrl();
    if (url) {
      window.open(`https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(url)}`, '_blank', 'noopener,noreferrer');
    }
    setIsOpen(false);
  };

  const handleShareReddit = () => {
    const url = getPublicShareUrl();
    if (url) {
      window.open(`https://reddit.com/submit?url=${encodeURIComponent(url)}&title=Shared from MemoryBase`, '_blank', 'noopener,noreferrer');
    }
    setIsOpen(false);
  };

  const sizeClasses = {
    sm: 'p-1.5 text-xs',
    md: 'p-2 text-sm',
    lg: 'p-3 text-base'
  };

  const button = (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`flex items-center gap-1.5 text-text-secondary hover:text-text-primary hover:bg-[var(--surfaceSecondary)] rounded-md transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${sizeClasses[size]}`}
    >
      {icon && <Share2 className="w-4 h-4" />}
    </motion.button>
  );

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        {/* We use a div wrapper to avoid Tooltip interacting weirdly with DropdownMenuTrigger */}
        <div>
          {!isOpen ? (
            <Tooltip content="Share">
              {button}
            </Tooltip>
          ) : (
            button
          )}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="start"
        sideOffset={4}
        className="w-[280px] rounded-[18px] p-[10px] bg-[var(--surface-elevated)] border border-[rgba(255,255,255,0.08)] shadow-[0_12px_40px_rgba(0,0,0,0.45)] text-text-primary duration-[160ms] ease-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-[0.96] data-[state=closed]:zoom-out-[0.96] data-[side=bottom]:slide-in-from-top-[4px] data-[side=top]:slide-in-from-bottom-[4px]"
      >
        <div className="mb-[8px] px-1 pt-1">
          <h3 className="text-[14px] font-semibold text-[var(--foreground)]">Share a public link to this message</h3>
        </div>
        
        <div className="flex flex-col gap-1">
          <DropdownMenuItem 
            onSelect={handleCopyLink}
            className="flex items-center gap-[12px] h-[40px] px-[12px] rounded-[10px] cursor-pointer outline-none transition-colors hover:bg-[rgba(255,255,255,0.06)] focus:bg-[rgba(255,255,255,0.06)] active:scale-[0.98]"
          >
            <LinkIcon className="w-[18px] h-[18px]" />
            <span className="text-[14px] font-medium">Copy link</span>
          </DropdownMenuItem>

          <DropdownMenuItem 
            onSelect={handleShareX}
            className="flex items-center gap-[12px] h-[40px] px-[12px] rounded-[10px] cursor-pointer outline-none transition-colors hover:bg-[rgba(255,255,255,0.06)] focus:bg-[rgba(255,255,255,0.06)] active:scale-[0.98]"
          >
            <IconBrandX className="w-[18px] h-[18px]" stroke={1.5} />
            <span className="text-[14px] font-medium">X</span>
          </DropdownMenuItem>

          <DropdownMenuItem 
            onSelect={handleShareLinkedIn}
            className="flex items-center gap-[12px] h-[40px] px-[12px] rounded-[10px] cursor-pointer outline-none transition-colors hover:bg-[rgba(255,255,255,0.06)] focus:bg-[rgba(255,255,255,0.06)] active:scale-[0.98]"
          >
            <IconBrandLinkedin className="w-[18px] h-[18px]" stroke={1.5} />
            <span className="text-[14px] font-medium">LinkedIn</span>
          </DropdownMenuItem>

          <DropdownMenuItem 
            onSelect={handleShareReddit}
            className="flex items-center gap-[12px] h-[40px] px-[12px] rounded-[10px] cursor-pointer outline-none transition-colors hover:bg-[rgba(255,255,255,0.06)] focus:bg-[rgba(255,255,255,0.06)] active:scale-[0.98]"
          >
            <IconBrandReddit className="w-[18px] h-[18px]" stroke={1.5} />
            <span className="text-[14px] font-medium">Reddit</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
