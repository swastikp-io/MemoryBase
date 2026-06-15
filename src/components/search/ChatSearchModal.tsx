import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, MessageSquare, Calendar } from 'lucide-react';
import { useSearchStore } from '../../store/search';
import { useChatStore } from "../../store/chatStore";
import MiniSearch from 'minisearch';

export const ChatSearchModal: React.FC = () => {
  const { isOpen, close } = useSearchStore();
  const { chats, loadChat } = useChatStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const miniSearch = useRef(new MiniSearch({
    fields: ['title', 'content'],
    storeFields: ['id', 'title', 'content', 'date', 'chatId'],
    searchOptions: {
      boost: { title: 2 },
      fuzzy: 0.2
    }
  }));

  // Re-index when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      
      const docs: any[] = [];
      chats.forEach(chat => {
        docs.push({
          id: `chat-${chat.id}`,
          chatId: chat.id,
          title: chat.title,
          content: [] /* messages not on ChatSession */.map(m => m.content).join(' '),
          date: chat.updatedAt
        });
      });
      miniSearch.current.removeAll();
      miniSearch.current.addAll(docs);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen, chats]);

  useEffect(() => {
    if (query.trim()) {
      const searchResults = miniSearch.current.search(query);
      setResults(searchResults);
    } else {
      setResults([]);
    }
  }, [query]);

  // Keyboard shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        useSearchStore.getState().toggle();
      }
      if (e.key === 'Escape') {
        close();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [close]);

  const handleSelect = (chatId: string) => {
    loadChat(chatId);
    close();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[10vh] sm:pt-[20vh] px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={close}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-2xl bg-[var(--background)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="flex items-center px-4 py-3 border-b border-[var(--border)]">
              <Search className="w-5 h-5 text-text-secondary mr-3" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search messages, chats, and knowledge..."
                className="flex-1 bg-transparent border-none outline-none text-text-primary placeholder:text-text-secondary/50 text-lg"
              />
              <button onClick={close} className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-[var(--surfaceSecondary)] rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="max-h-[60vh] overflow-y-auto p-2 scrollbar-thin">
              {query.trim() === '' ? (
                <div className="p-8 text-center text-text-secondary">
                  <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Start typing to search your conversations</p>
                </div>
              ) : results.length === 0 ? (
                <div className="p-8 text-center text-text-secondary">
                  <p className="text-sm">No results found for "{query}"</p>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {results.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => handleSelect(result.chatId)}
                      className="flex flex-col items-start gap-1 p-3 hover:bg-[var(--surfaceSecondary)] rounded-xl transition-colors text-left w-full group"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-medium text-text-primary">{result.title}</span>
                        <div className="flex items-center gap-1.5 text-[11px] text-text-secondary">
                          <Calendar className="w-3 h-3" />
                          {new Date(result.date).toLocaleDateString()}
                        </div>
                      </div>
                      <span className="text-sm text-text-secondary line-clamp-2">
                        {result.content}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="px-4 py-2 border-t border-[var(--border)] flex items-center justify-between text-[11px] text-text-secondary bg-[var(--surface)]">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1"><kbd className="bg-[var(--surfaceSecondary)] px-1.5 py-0.5 rounded border border-[var(--border)]">↑↓</kbd> to navigate</span>
                <span className="flex items-center gap-1"><kbd className="bg-[var(--surfaceSecondary)] px-1.5 py-0.5 rounded border border-[var(--border)]">Enter</kbd> to select</span>
                <span className="flex items-center gap-1"><kbd className="bg-[var(--surfaceSecondary)] px-1.5 py-0.5 rounded border border-[var(--border)]">Esc</kbd> to close</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
