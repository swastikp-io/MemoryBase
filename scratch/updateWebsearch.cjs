const fs = require('fs');
let code = fs.readFileSync('server/services/websearch.ts', 'utf8');

if (!code.includes('WikipediaProvider')) {
  code = `import { WikipediaProvider } from './wikipedia.ts';\n` + code;
}

if (!code.includes('isWikipedia?')) {
  code = code.replace(
    /export interface SearchResult \{/,
    `export interface SearchResult {\n  isWikipedia?: boolean;\n  score?: number;`
  );
}

// Extract searchWeb implementation block
const searchWebIndex = code.indexOf('export async function searchWeb(query: string): Promise<SearchResult[]> {');
if (searchWebIndex === -1) {
  console.error('searchWeb not found');
  process.exit(1);
}

const buildSearchContextIndex = code.indexOf('export function buildSearchContext(');

// Replace from searchWeb to buildSearchContext
const newSearchWeb = `export async function searchWeb(query: string): Promise<SearchResult[]> {
  const apiKey = process.env.WEB_SEARCH_API || process.env.WEB_SEARCH_API_KEY;
  
  // We launch both providers concurrently
  const [wikiResults, webResults] = await Promise.all([
    WikipediaProvider.search(query),
    (async (): Promise<SearchResult[]> => {
      if (!apiKey) {
        console.warn("[WebSearch] API Key not set. Web search will not work.");
        return [];
      }
      const maxRetries = parseInt(process.env.WEB_SEARCH_MAX_RETRIES || "2");
      const timeoutMs = parseInt(process.env.WEB_SEARCH_TIMEOUT_MS || "10000");

      let attempt = 0;
      while (attempt <= maxRetries) {
        try {
          const url = new URL("https://api.websearchapi.com/v1");
          url.searchParams.append("api_key", apiKey);
          url.searchParams.append("q", query);
          url.searchParams.append("num", "5");

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

          const response = await fetch(url.toString(), { signal: controller.signal });
          clearTimeout(timeoutId);

          if (!response.ok) {
            if (response.status >= 500) throw new Error(\`Temporary server error: \${response.status}\`);
            console.error(\`[WebSearch] Non-retriable error status: \${response.status}\`);
            return []; 
          }

          const contentType = response.headers.get("content-type") || "";
          if (!contentType.includes("application/json")) {
            const text = await response.text();
            if (text.trim().toLowerCase().startsWith("<!doctype html") || text.trim().toLowerCase().startsWith("<html")) {
              console.error(\`[WebSearch] HTML Response Detected instead of JSON.\`);
            }
            return [];
          }

          const text = await response.text();
          let data;
          try { data = JSON.parse(text); } catch (e) { return []; }

          const results = data.organic_results || [];
          return results.slice(0, 5).map((r: any) => ({
            title: r.title || "",
            url: r.url || "",
            snippet: r.snippet || "",
          }));
        } catch (error: any) {
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1))); 
          }
          attempt++;
        }
      }
      return [];
    })()
  ]);

  // Combine and Score Results
  // Wikipedia base score: 1.0, decreasing by 0.1 per rank
  wikiResults.forEach((r, i) => { r.score = 1.0 - (i * 0.1); });
  // WebSearch base score: 0.8, decreasing by 0.15 per rank
  webResults.forEach((r, i) => { r.score = 0.8 - (i * 0.15); });

  const combined = [...wikiResults, ...webResults];
  
  // Deduplicate by URL
  const seenUrls = new Set<string>();
  const unified: SearchResult[] = [];
  
  for (const result of combined) {
    if (!seenUrls.has(result.url)) {
      seenUrls.add(result.url);
      unified.push(result);
    }
  }

  // Sort by calculated score descending
  unified.sort((a, b) => (b.score || 0) - (a.score || 0));

  // Return top 7 unified results to ensure diversity without overwhelming
  return unified.slice(0, 7);
}

`;

code = code.substring(0, searchWebIndex) + newSearchWeb + code.substring(buildSearchContextIndex);
fs.writeFileSync('server/services/websearch.ts', code);
console.log('websearch.ts updated successfully');
