import { SearchResult } from './websearch.ts';

// Simple native TTL Cache
class TTLCache<T> {
  private cache = new Map<string, { value: T; expiry: number }>();

  constructor(private ttlSeconds: number) {}

  set(key: string, value: T) {
    this.cache.set(key, {
      value,
      expiry: Date.now() + this.ttlSeconds * 1000
    });
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }
}

export class WikipediaProvider {
  private static cache: TTLCache<any>;

  static initCache() {
    if (!this.cache) {
      const ttl = parseInt(process.env.WIKIPEDIA_CACHE_TTL || "3600");
      this.cache = new TTLCache(ttl);
    }
  }

  static isEnabled(): boolean {
    return process.env.ENABLE_WIKIPEDIA_SEARCH !== "false";
  }

  static isEnrichmentEnabled(): boolean {
    return process.env.ENABLE_WIKIPEDIA_ENRICHMENT !== "false";
  }

  static getLang(): string {
    return process.env.WIKIPEDIA_LANGUAGE || "en";
  }

  static getTimeout(): number {
    return parseInt(process.env.WIKIPEDIA_REQUEST_TIMEOUT || "10000");
  }

  private static async fetchWithTimeout(url: string): Promise<any> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), this.getTimeout());
    try {
      const response = await fetch(url, { 
        signal: controller.signal,
        headers: { 'User-Agent': 'MemoryBase-KnowledgeBot/1.0' }
      });
      clearTimeout(id);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (e: any) {
      clearTimeout(id);
      throw e;
    }
  }

  /**
   * Standard search returning SearchResult[] for unified pipeline.
   */
  static async search(query: string): Promise<SearchResult[]> {
    if (!this.isEnabled()) return [];
    this.initCache();

    const cacheKey = `search:${query}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const lang = this.getLang();
      const url = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&origin=*`;
      const data = await this.fetchWithTimeout(url);

      if (!data.query || !data.query.search) return [];

      const results: SearchResult[] = data.query.search.map((item: any) => {
        // Snippet often contains HTML tags like <span class="searchmatch">
        let snippet = item.snippet.replace(/<[^>]+>/g, '');
        // Decode HTML entities
        snippet = snippet.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
        
        return {
          title: item.title,
          url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
          snippet: snippet + '...',
          isWikipedia: true
        };
      });

      this.cache.set(cacheKey, results);
      return results;
    } catch (error) {
      console.error(`[Wikipedia] Search failed for query "${query}":`, error);
      return [];
    }
  }

  /**
   * Deep enrichment extracting high-quality summary and related categories for Deep Research.
   */
  static async getEnrichment(query: string): Promise<string> {
    if (!this.isEnrichmentEnabled()) return "";
    this.initCache();

    const cacheKey = `enrich:${query}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const lang = this.getLang();
      // Use the REST API to get the summary
      const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query.replace(/ /g, '_'))}`;
      const data = await this.fetchWithTimeout(url);

      if (data.type === "disambiguation" || !data.extract) {
        return ""; // Cannot reliably use disambiguation pages for enrichment
      }

      let enrichmentText = `Wikipedia Extract for ${data.title}:\n${data.extract}\n`;
      
      // Optionally could fetch categories or related here, but extract is usually sufficient
      
      this.cache.set(cacheKey, enrichmentText);
      return enrichmentText;
    } catch (error) {
      console.error(`[Wikipedia] Enrichment failed for query "${query}":`, error);
      return ""; // Graceful degradation
    }
  }
}
