import MiniSearch from 'minisearch';
import type { ChatSession } from '../../context/ChatContext';

export interface SearchResult {
  chatId: string;
  title: string;
  snippet: string;
  score: number;
}

export interface SearchProvider {
  search(query: string): Promise<SearchResult[]>;
  index(chats: ChatSession[]): void;
}

class KeywordSearchProvider implements SearchProvider {
  private miniSearch: MiniSearch;

  constructor() {
    this.miniSearch = new MiniSearch({
      fields: ['title', 'content'],
      storeFields: ['title', 'content'],
      idField: 'id',
      searchOptions: {
        fuzzy: 0.2,
        prefix: true,
        boost: { title: 2 }
      }
    });
  }

  public index(chats: ChatSession[]) {
    this.miniSearch.removeAll();
    const docs = chats.map(chat => ({
      id: chat.id,
      title: chat.title,
      content: chat.messages.map(m => m.content).join('\n\n')
    }));
    this.miniSearch.addAll(docs);
  }

  public async search(query: string): Promise<SearchResult[]> {
    if (!query.trim()) return [];
    
    const results = this.miniSearch.search(query);
    
    return results.map(res => {
      const title = res.title as string;
      const content = res.content as string;
      
      let snippet = content ? content.substring(0, 120).replace(/\n/g, ' ') : '';
      
      const matchTerms = Object.keys(res.match);
      if (content && matchTerms.length > 0) {
        const firstTerm = matchTerms[0];
        const index = content.toLowerCase().indexOf(firstTerm.toLowerCase());
        if (index !== -1) {
          const start = Math.max(0, index - 40);
          const end = Math.min(content.length, index + 80);
          snippet = (start > 0 ? '...' : '') + content.substring(start, end).replace(/\n/g, ' ') + (end < content.length ? '...' : '');
        }
      }

      if (snippet.length > 120) {
        snippet = snippet.substring(0, 120) + '...';
      }

      return {
        chatId: res.id,
        title: title || 'Untitled Chat',
        snippet,
        score: res.score
      };
    });
  }
}

export const chatSearchProvider = new KeywordSearchProvider();
