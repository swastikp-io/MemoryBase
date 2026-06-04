import React, { useState } from 'react';
import { useChat } from '../context/ChatContext';
import { Plus, MessageSquare, PanelLeftClose, PanelLeft, Search, LayoutGrid, Sparkles, Settings as SettingsIcon, SquarePen, X, MoreHorizontal, Pencil, Command, Menu } from 'lucide-react';
import { useSettingsStore } from '../store/settings';
import { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar, onOpenSettings }) => {
  const { chats, currentChatId, selectChat, createNewChat, updateChatTitle } = useChat();
  const settings = useSettingsStore();
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
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
      updateChatTitle(chatId, renameValue.trim(), false, true);
    }
    setRenamingId(null);
  };

  const userInitial = settings.profile.displayName ? settings.profile.displayName.charAt(0).toUpperCase() : (settings.profile.username ? settings.profile.username.charAt(0).toUpperCase() : 'U');
  const userName = settings.profile.displayName || settings.profile.username || 'User';

  const filteredChats = chats.filter(chat => 
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {!isOpen && (
        <button
          onClick={toggleSidebar}
          className="fixed top-3 left-4 z-50 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          title="Open sidebar"
        >
          <Menu className="w-5 h-5 text-text-secondary" />
        </button>
      )}

      <div
        className={`z-50 bg-bg-sidebar h-full flex flex-col transition-all duration-300 overflow-hidden ${
          isOpen ? "w-[280px]" : "w-[0px]"
        } shrink-0`}
      >
        {isOpen && (
          <div className="flex flex-col h-full w-full">
            {/* Top Bar */}
            <div className="flex items-center justify-between p-4 pb-3">
              <div className="flex items-center text-text-secondary px-1 hover:text-text-primary transition-colors cursor-pointer">
                <Command className="w-5 h-5" />
              </div>
              <button
                onClick={toggleSidebar}
                className="p-1.5 rounded-full hover:bg-white/10 transition-colors text-text-secondary hover:text-white"
                title="Collapse menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation / Actions */}
            <div className="px-3 pt-4 flex flex-col gap-2">
              <button
                onClick={createNewChat}
                className="w-full px-4 py-2.5 bg-[#2A2A2A] hover:bg-[#333333] rounded-full text-text-primary font-medium text-[13px] transition-colors text-left"
              >
                New Chat
              </button>

              <button 
                onClick={() => setIsSearching(true)}
                className="w-full px-4 py-2.5 bg-[#2A2A2A] hover:bg-[#333333] rounded-full text-text-secondary hover:text-text-primary font-medium text-[13px] transition-colors text-left"
              >
                Search Chats
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
                      <div className="flex items-center gap-2 w-full px-4 py-2 rounded-full bg-black/10 dark:bg-white/5 text-[13px]">
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
                        onClick={() => selectChat(chat.id)}
                        className={`w-full text-left px-4 py-2 rounded-full text-[13px] truncate transition-colors flex items-center gap-3 ${
                          currentChatId === chat.id
                            ? 'bg-white/10 text-text-primary font-medium'
                            : 'text-[#A0A0A0] hover:bg-white/5 hover:text-text-primary font-medium'
                        }`}
                      >
                        <span className="truncate pr-6">{chat.title}</span>
                      </button>
                    )}
                    
                    {!isRenaming && (
                      <div className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity ${(activeMenuId === chat.id || currentChatId === chat.id) ? 'opacity-100' : ''}`}>
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
                              currentChatId === chat.id 
                                ? 'hover:bg-black/20 dark:hover:bg-white/20 hover:text-text-primary' 
                                : 'hover:bg-black/10 dark:hover:bg-white/10 hover:text-text-primary'
                            }`}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                          
                          {activeMenuId === chat.id && menuCoords && createPortal(
                            <div 
                              ref={menuRef}
                              style={{ top: menuCoords.top, left: menuCoords.left }}
                              className="fixed w-36 bg-bg-input shadow-xl rounded-xl py-1 z-[100] border border-border-color"
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
            <div className="p-3 mt-auto">
              <div className="flex items-center justify-between w-full p-1.5 hover:bg-white/5 rounded-full transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-semibold text-[14px]">
                    {userInitial}
                  </div>
                  <span className="text-[14px] font-medium text-text-primary">{userName}</span>
                </div>
                <button
                  onClick={onOpenSettings}
                  className="p-2 text-text-secondary hover:text-text-primary hover:bg-white/10 rounded-full transition-colors mr-1"
                >
                  <SettingsIcon className="w-[20px] h-[20px]" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

