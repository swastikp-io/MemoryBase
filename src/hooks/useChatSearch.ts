import { useState, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import { chatSearchProvider, SearchResult } from '../services/search/searchIndex';

export function useChatSearch(query: string) {
  const { chats } = useChat();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Update index when chats change
  useEffect(() => {
    chatSearchProvider.index(chats);
  }, [chats]);

  // Perform search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const performSearch = async () => {
      setIsSearching(true);
      try {
        const res = await chatSearchProvider.search(query);
        setResults(res);
      } catch (e) {
        console.error('Search failed', e);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [query]);

  return { results, isSearching };
}
