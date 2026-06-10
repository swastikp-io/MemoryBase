import React, { useEffect, useRef, useState } from 'react';
import { useSearchStore } from '../../store/search';
import { useChatSearch } from '../../hooks/useChatSearch';
import { useChat } from '../../context/ChatContext';

export const ChatSearchModal: React.FC = () => {
  const { isOpen, close, query, setQuery } = useSearchStore();
  const { results, isSearching } = useChatSearch(query);
  const { selectChat } = useChat();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  useEffect(() => {
    const saved = localStorage.getItem('paralex-recent-searches');
    if (saved) {
      try { setRecentSearches(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  const addRecentSearch = (q: string) => {
    if (!q.trim()) return;
    const newRecents = [q, ...recentSearches.filter(s => s !== q)].slice(0, 5);
    setRecentSearches(newRecents);
    localStorage.setItem('paralex-recent-searches', JSON.stringify(newRecents));
  };

  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isOpen, query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        useSearchStore.getState().open();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!query && recentSearches.length > 0) {
        setSelectedIndex(prev => Math.min(prev + 1, recentSearches.length - 1));
      } else {
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (!query && recentSearches.length > 0) {
        setQuery(recentSearches[selectedIndex]);
      } else if (results.length > 0 && results[selectedIndex]) {
        addRecentSearch(query);
        selectChat(results[selectedIndex].chatId);
        close();
      }
    }
  };

  const handleSelectResult = (chatId: string) => {
    addRecentSearch(query);
    selectChat(chatId);
    close();
  };

  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === highlight.toLowerCase() 
            ? <span key={i} className="text-text-primary font-medium bg-[var(--accentMuted)] rounded px-0.5">{part}</span> 
            : part
        )}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm" onClick={close}>
      <div 
        className="w-full max-w-[640px] bg-[var(--surface)] border border-[var(--border)] shadow-2xl rounded-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center px-5 py-4 border-b border-[var(--border)]">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search chats..."
            className="flex-1 bg-transparent border-none outline-none text-[var(--textPrimary)] text-[16px] placeholder-[var(--textSecondary)]"
          />
        </div>

        <div className="max-h-[50vh] overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--border)]">
          {!query ? (
            recentSearches.length > 0 ? (
              <div className="py-2">
                <div className="px-5 py-2 text-[11px] font-semibold text-[var(--textSecondary)] uppercase tracking-wider">
                  Recent Searches
                </div>
                {recentSearches.map((search, idx) => (
                  <div
                    key={search}
                    onClick={() => setQuery(search)}
                    className={`px-5 py-3 cursor-pointer text-[var(--textPrimary)] text-[14px] ${idx === selectedIndex ? 'bg-[var(--surfaceSecondary)]' : 'hover:bg-[var(--surfaceSecondary)]'}`}
                  >
                    {search}
                  </div>
                ))}
              </div>
            ) : null
          ) : (
            results.length > 0 ? (
              <div className="py-2">
                {results.map((res, idx) => (
                  <div
                    key={res.chatId}
                    onClick={() => handleSelectResult(res.chatId)}
                    className={`px-5 py-3 cursor-pointer border-l-2 ${idx === selectedIndex ? 'bg-[var(--surfaceSecondary)] border-[var(--accent)]' : 'border-transparent hover:bg-[var(--surfaceSecondary)]'}`}
                  >
                    <div className="text-[var(--textPrimary)] font-medium text-[14px] mb-1">
                      {highlightText(res.title, query)}
                    </div>
                    {res.snippet && (
                      <div className="text-[var(--textSecondary)] text-[13px] leading-relaxed line-clamp-1">
                        {highlightText(res.snippet, query)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-[var(--textSecondary)] text-[14px]">
                No chats found
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
