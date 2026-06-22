import { SearchResult } from './websearch.ts';

export class WikipediaProvider {
  static async search(query: string): Promise<SearchResult[]> {
    try {
      const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&origin=*`;
      const response = await fetch(url);
      if (!response.ok) return [];

      const data = await response.json();
      const searchResults = data?.query?.search || [];

      return searchResults.slice(0, 5).map((item: any) => ({
        isWikipedia: true,
        title: item.title,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
        snippet: item.snippet.replace(/<[^>]*>?/gm, ''), // Remove HTML tags from snippet
      }));
    } catch (error) {
      console.error('[WikipediaProvider] Search failed:', error);
      return [];
    }
  }

  static async getEnrichment(query: string): Promise<string> {
    try {
      // First search to get the most relevant title
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&origin=*`;
      const searchResponse = await fetch(searchUrl);
      if (!searchResponse.ok) return '';

      const searchData = await searchResponse.json();
      const firstResult = searchData?.query?.search?.[0];
      if (!firstResult) return '';

      // Then fetch the extract for that title
      const title = firstResult.title;
      const extractUrl = `https://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&exintro&explaintext&redirects=1&titles=${encodeURIComponent(title)}&origin=*`;
      const extractResponse = await fetch(extractUrl);
      if (!extractResponse.ok) return '';

      const extractData = await extractResponse.json();
      const pages = extractData?.query?.pages;
      if (!pages) return '';

      const pageId = Object.keys(pages)[0];
      if (pageId === '-1') return '';

      const extract = pages[pageId]?.extract || '';
      return extract;
    } catch (error) {
      console.error('[WikipediaProvider] Enrichment failed:', error);
      return '';
    }
  }
}
