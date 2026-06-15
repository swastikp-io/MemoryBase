export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export async function searchWeb(query: string): Promise<SearchResult[]> {
  const apiKey = process.env.WEB_SEARCH_API || process.env.WEB_SEARCH_API_KEY;
  if (!apiKey) {
    console.warn("WEB_SEARCH_API is not set. Web search will not work.");
    return [];
  }

  try {
    const url = new URL("https://api.websearchapi.com/v1");
    url.searchParams.append("api_key", apiKey);
    url.searchParams.append("q", query);
    url.searchParams.append("num", "5");

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`WebSearchAPI returned status: ${response.status}`);
    }

    const data = await response.json();
    const results = data.organic_results || [];

    return results.slice(0, 5).map((r: any) => ({
      title: r.title || "",
      url: r.url || "",
      snippet: r.snippet || "",
    }));
  } catch (error) {
    console.error("Error calling WebSearchAPI:", error);
    return [];
  }
}

export function buildSearchContext(results: SearchResult[]): string {
  if (!results || results.length === 0) return "";
  
  let context = "\n\nWeb Results:\n";
  results.forEach((r, i) => {
    context += `${i + 1}. [${r.title}](${r.url})\n${r.snippet}\n\n`;
  });
  
  context += "Use the search results above when answering the user's question.\n\n";
  return context;
}
