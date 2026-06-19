import React, { useState } from 'react';
import { useChatStore } from '../store/chatStore';
import { Plus, MessageSquare, PanelLeftClose, PanelLeft, Search, LayoutGrid, Sparkles, Settings as SettingsIcon, SquarePen, X, MoreHorizontal, Pencil, Trash2, Command, Menu, LogOut } from 'lucide-react';
import { DeleteChatModal } from './DeleteChatModal';
import { useSettingsStore } from '../store/settings';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

import { useSearchStore } from '../store/search';
import { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar, onOpenSettings }) => {
  const { chats, activeChatId, loadChat, renameChat } = useChatStore();
  const settings = useSettingsStore();

  const searchStore = useSearchStore();
  const [searchQuery, setSearchQuery] = useState('');
  
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { deleteChat } = useChatStore();
  const menuRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRenameSubmit = (chatId: string) => {
    if (renameValue.trim()) {
      renameChat(chatId, renameValue.trim());
    }
    setRenamingId(null);
  };

  const handleDeleteConfirm = async () => {
    if (deletingId) {
      setIsDeleting(true);
      try {
        await deleteChat(deletingId);
      } catch (err) {
        alert('Failed to delete conversation');
      } finally {
        setIsDeleting(false);
        setDeletingId(null);
      }
    }
  };

  const userInitial = settings.profile.displayName ? settings.profile.displayName.charAt(0).toUpperCase() : 'U';
  const userName = settings.profile.displayName || 'User';

  const filteredChats = chats.filter(chat => 
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className={`z-50 bg-[var(--background)] h-full flex flex-col transition-all duration-300 overflow-hidden border-r border-[var(--border)] shrink-0 ${
        isOpen ? "w-[280px]" : "w-[60px]"
      }`}
    >
      {isOpen ? (
        <div className="flex flex-col h-full w-full">
          {/* Top Bar */}
          <div className="flex items-center justify-between p-4 pb-3">
            <div className="flex items-center text-text-secondary px-1 hover:text-text-primary transition-colors cursor-pointer">
              <Command className="w-5 h-5" />
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleSidebar}
                  className="p-1.5 rounded-full hover:bg-[var(--surfaceSecondary)] transition-colors text-text-secondary hover:text-text-primary"
                >
                  <Menu className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Collapse menu</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Navigation / Actions */}
          <div className="px-3 pt-4 flex flex-col gap-2">
            <button
              onClick={() => useChatStore.setState({ activeChatId: null, messages: [] })}
              className="w-full px-4 py-2.5 bg-[var(--surface)] hover:bg-[var(--surfaceSecondary)] border border-[var(--border)] rounded-full text-text-primary font-medium text-[13px] transition-colors text-left"
            >
              New Chat
            </button>

            <button 
              onClick={() => searchStore.open()}
              className="w-full px-4 py-2.5 bg-[var(--surface)] hover:bg-[var(--surfaceSecondary)] border border-[var(--border)] rounded-full text-text-secondary hover:text-text-primary font-medium text-[13px] transition-colors text-left flex items-center justify-between"
            >
              <span>Search Chats</span>
              <div className="flex items-center gap-1 text-[10px] text-text-secondary bg-[var(--surfaceSecondary)] px-1.5 py-0.5 rounded">
                <span>⌘</span><span>K</span>
              </div>
            </button>
          </div>

          {/* Chats List */}
          <div className="flex-1 overflow-y-auto px-3 py-2 mt-8 space-y-0.5 scrollbar-thin scrollbar-thumb-border-color">
            <div className="px-4 py-2 text-[12px] font-medium text-text-secondary mb-1 flex items-center gap-1">
              {searchQuery ? 'Search Results' : 'Recents'} <span className="text-[10px]">▼</span>
            </div>
            {filteredChats.length === 0 && searchQuery && (
              <div className="px-4 py-2 text-[13px] text-text-secondary">No chats found.</div>
            )}
            {filteredChats.map(chat => {
              const isRenaming = renamingId === chat.id;
              
              return (
                <div key={chat.id} className="relative group">
                  {isRenaming ? (
                    <div className="flex items-center gap-2 w-full px-4 py-2 rounded-full bg-[var(--surfaceSecondary)] text-[13px]">
                      <input
                        autoFocus
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => handleRenameSubmit(chat.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameSubmit(chat.id);
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                        className="bg-transparent border-none outline-none text-text-primary w-full"
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => loadChat(chat.id)}
                      className={`w-full text-left px-4 py-2 rounded-full text-[13px] truncate transition-colors flex items-center gap-3 ${
                        activeChatId === chat.id
                          ? 'bg-[var(--surfaceSecondary)] text-text-primary font-medium'
                          : 'text-text-secondary hover:bg-[var(--surface)] hover:text-text-primary font-medium'
                      }`}
                    >
                      <span className="truncate pr-6">{chat.title}</span>
                    </button>
                  )}
                  
                  {!isRenaming && (
                    <div className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity ${(activeMenuId === chat.id || activeChatId === chat.id) ? 'opacity-100' : ''}`}>
                      <div className="relative">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (activeMenuId === chat.id) {
                              setActiveMenuId(null);
                            } else {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setMenuCoords({ top: rect.top, left: rect.right + 10 });
                              setActiveMenuId(chat.id);
                            }
                          }}
                          className={`p-1.5 rounded-full text-text-secondary transition-colors ${
                            activeChatId === chat.id 
                              ? 'hover:bg-[var(--surfaceSecondary)] hover:text-text-primary' 
                              : 'hover:bg-[var(--surface)] hover:text-text-primary'
                          }`}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        
                        {activeMenuId === chat.id && menuCoords && createPortal(
                          <div 
                            ref={menuRef}
                            style={{ top: menuCoords.top, left: menuCoords.left }}
                            className="fixed w-36 bg-[var(--surface)] shadow-xl rounded-xl py-1 z-[100] border border-[var(--border)]"
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRenamingId(chat.id);
                                setRenameValue(chat.title);
                                setActiveMenuId(null);
                              }}
                              className="flex items-center gap-3 w-full px-3 py-2 text-[13px] text-text-primary hover:bg-white/5 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              Rename
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingId(chat.id);
                                setActiveMenuId(null);
                              }}
                              className="flex items-center gap-3 w-full px-3 py-2 text-[13px] text-red-500 hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          </div>,
                          document.body
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom User Area */}
          <div className="p-3 mt-auto relative z-10">
            <div className="relative flex items-center justify-between w-full p-1.5 hover:bg-[var(--surface)] rounded-full transition-colors group overflow-hidden z-20">
              <div className="flex items-center gap-3 relative z-30">
                <div className="w-8 h-8 rounded-full bg-[var(--accentMuted)] text-[var(--accent)] flex items-center justify-center font-semibold text-[14px]">
                  {userInitial}
                </div>
                <span className="text-[14px] font-medium text-text-primary">{userName}</span>
              </div>
              <div className="flex items-center gap-1 relative z-30">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={onOpenSettings}
                      className="relative flex items-center justify-center w-10 h-10 text-text-secondary hover:text-text-primary hover:bg-[var(--surfaceSecondary)] rounded-full transition-all duration-200 border border-transparent hover:border-[var(--border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] hover:shadow-sm active:scale-95 overflow-hidden group/settings"
                      aria-label="Settings"
                    >
                      <SettingsIcon className="w-[18px] h-[18px] relative z-10 transition-transform duration-300 group-hover/settings:rotate-45" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Settings</p>
                  </TooltipContent>
                </Tooltip>

              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full w-full items-center py-4">
          {/* Top Logo / Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-full hover:bg-[var(--surfaceSecondary)] transition-colors text-text-primary hover:text-text-primary mb-6"
              >
                <Command className="w-6 h-6" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Expand menu</p>
            </TooltipContent>
          </Tooltip>

          {/* Actions */}
          <div className="flex flex-col gap-4 w-full items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => useChatStore.setState({ activeChatId: null, messages: [] })}
                  className="p-2 rounded-full hover:bg-[var(--surfaceSecondary)] transition-colors text-text-secondary hover:text-text-primary"
                >
                  <SquarePen className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>New Chat</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => searchStore.open()}
                  className="p-2 rounded-full hover:bg-[var(--surfaceSecondary)] transition-colors text-text-secondary hover:text-text-primary"
                >
                  <Search className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Search</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleSidebar}
                  className="p-2 rounded-full hover:bg-[var(--surfaceSecondary)] transition-colors text-text-secondary hover:text-text-primary"
                >
                  <MessageSquare className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Chats</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Bottom User Area */}
          <div className="mt-auto flex flex-col items-center gap-4 pb-4">
            <div className="relative group flex items-center justify-center p-2 hover:bg-[var(--surface)] rounded-[16px] transition-colors cursor-pointer">
              <div 
                className="w-8 h-8 rounded-full bg-[var(--surfaceSecondary)] text-text-primary flex items-center justify-center font-medium text-[13px]"
              >
                {userInitial}
              </div>
              <div className="absolute left-[calc(100%+14px)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap bg-[var(--surface)] text-text-primary text-[14px] font-bold px-4 py-2 rounded-[12px] shadow-lg border border-[var(--border)]">
                {userName}
              </div>
            </div>

          </div>
        </div>
      )}

      <DeleteChatModal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </div>
  );
};

