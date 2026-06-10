import OpenAI from 'openai';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface SearchTelemetry {
  query: string;
  durationMs: number;
  cacheHit: boolean;
  success: boolean;
  resultCount: number;
  timestamp: number;
}

interface CacheEntry {
  results: WebSearchResult[];
  timestamp: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const SEARCH_MODEL = 'openai/gpt-4.1-nano';
const MAX_SEARCH_RESULTS = 5;

// ─── Cache ───────────────────────────────────────────────────────────────────

const searchCache = new Map<string, CacheEntry>();
const telemetryLog: SearchTelemetry[] = [];

function getCacheKey(query: string): string {
  return query.trim().toLowerCase();
}

function getCachedResults(query: string): WebSearchResult[] | null {
  const key = getCacheKey(query);
  const entry = searchCache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    searchCache.delete(key);
    return null;
  }

  return entry.results;
}

function setCachedResults(query: string, results: WebSearchResult[]): void {
  const key = getCacheKey(query);
  searchCache.set(key, { results, timestamp: Date.now() });

  // Evict old entries to prevent unbounded growth
  if (searchCache.size > 200) {
    const oldest = searchCache.keys().next().value;
    if (oldest !== undefined) {
      searchCache.delete(oldest);
    }
  }
}

// ─── Telemetry ───────────────────────────────────────────────────────────────

function recordTelemetry(entry: SearchTelemetry): void {
  telemetryLog.push(entry);
  // Keep last 500 entries
  if (telemetryLog.length > 500) {
    telemetryLog.shift();
  }

  const status = entry.success ? '✓' : '✗';
  const cache = entry.cacheHit ? 'CACHE HIT' : 'CACHE MISS';
  console.log(
    `[WebSearch] ${status} | ${cache} | ${entry.durationMs}ms | ${entry.resultCount} results | "${entry.query.substring(0, 60)}"`
  );
}

export function getSearchTelemetry(): ReadonlyArray<SearchTelemetry> {
  return telemetryLog;
}

// ─── Core Search Function ────────────────────────────────────────────────────

/**
 * Performs a web search using OpenRouter's `openrouter:web_search` server tool.
 * Returns parsed search results, or an empty array on failure.
 */
export async function searchWeb(
  openai: OpenAI,
  query: string
): Promise<WebSearchResult[]> {
  if (!query || !query.trim()) return [];

  // Check cache first
  const cached = getCachedResults(query);
  if (cached) {
    recordTelemetry({
      query,
      durationMs: 0,
      cacheHit: true,
      success: true,
      resultCount: cached.length,
      timestamp: Date.now(),
    });
    return cached;
  }

  const startTime = Date.now();

  try {
    const completion = await openai.chat.completions.create({
      model: SEARCH_MODEL,
      messages: [
        {
          role: 'system',
          content: [
            'You are a web search assistant.',
            'Search the web for the user query and return the most relevant results.',
            'For each result, provide the title, URL, and a brief content snippet.',
            `Return up to ${MAX_SEARCH_RESULTS} results.`,
            'Format each result clearly.',
          ].join(' '),
        },
        {
          role: 'user',
          content: query,
        },
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'openrouter_web_search',
            description: 'Search the web',
            parameters: { type: 'object', properties: {} },
          },
        } as OpenAI.Chat.Completions.ChatCompletionTool,
      ],
      // Use the OpenRouter web search server tool
      // This is passed as an extra body parameter for the OpenRouter API
      // @ts-expect-error -- OpenRouter-specific extension: openrouter:web_search tool type
    } as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming & {
      tools: Array<{ type: string; parameters?: Record<string, unknown> }>;
    });

    // Parse the response — OpenRouter returns search results within the model's response
    const responseContent = completion.choices[0]?.message?.content || '';

    // Extract search results from the response
    const results = parseSearchResults(responseContent);

    const durationMs = Date.now() - startTime;
    setCachedResults(query, results);

    recordTelemetry({
      query,
      durationMs,
      cacheHit: false,
      success: true,
      resultCount: results.length,
      timestamp: Date.now(),
    });

    return results;
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[WebSearch] Search failed:', errorMessage);

    recordTelemetry({
      query,
      durationMs,
      cacheHit: false,
      success: false,
      resultCount: 0,
      timestamp: Date.now(),
    });

    return [];
  }
}

// ─── Alternative: Direct OpenRouter Web Search via tools array ───────────────

/**
 * Performs web search using OpenRouter's native `openrouter:web_search` tool type.
 * This is the recommended approach per OpenRouter documentation.
 * The search results are injected into the model's context automatically.
 */
export async function searchWebNative(
  openai: OpenAI,
  query: string
): Promise<WebSearchResult[]> {
  if (!query || !query.trim()) return [];

  const cached = getCachedResults(query);
  if (cached) {
    recordTelemetry({
      query,
      durationMs: 0,
      cacheHit: true,
      success: true,
      resultCount: cached.length,
      timestamp: Date.now(),
    });
    return cached;
  }

  const startTime = Date.now();

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openai.apiKey}`,
      },
      body: JSON.stringify({
        model: SEARCH_MODEL,
        messages: [
          {
            role: 'user',
            content: `Search the web for: ${query}\n\nProvide the top ${MAX_SEARCH_RESULTS} most relevant results with title, URL, and a brief content summary for each.`,
          },
        ],
        tools: [
          {
            type: 'openrouter:web_search',
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter search API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as OpenRouterSearchResponse;
    const responseContent = data.choices?.[0]?.message?.content || '';

    // Also check for annotations (OpenRouter returns citations as annotations)
    const annotations = data.choices?.[0]?.message?.annotations;
    let results: WebSearchResult[];

    if (annotations && Array.isArray(annotations) && annotations.length > 0) {
      results = parseAnnotations(annotations);
    } else {
      results = parseSearchResults(responseContent);
    }

    const durationMs = Date.now() - startTime;
    setCachedResults(query, results);

    recordTelemetry({
      query,
      durationMs,
      cacheHit: false,
      success: true,
      resultCount: results.length,
      timestamp: Date.now(),
    });

    return results;
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[WebSearch] Native search failed:', errorMessage);

    recordTelemetry({
      query,
      durationMs,
      cacheHit: false,
      success: false,
      resultCount: 0,
      timestamp: Date.now(),
    });

    return [];
  }
}

// ─── Response Parsing ────────────────────────────────────────────────────────

interface OpenRouterAnnotation {
  type?: string;
  url?: string;
  title?: string;
  content?: string;
}

interface OpenRouterSearchResponse {
  choices: Array<{
    message: {
      content: string;
      annotations?: OpenRouterAnnotation[];
    };
  }>;
}

function parseAnnotations(annotations: OpenRouterAnnotation[]): WebSearchResult[] {
  return annotations
    .filter((a): a is OpenRouterAnnotation & { url: string } => typeof a.url === 'string' && a.url.length > 0)
    .slice(0, MAX_SEARCH_RESULTS)
    .map((a) => ({
      title: a.title || 'Untitled',
      url: a.url,
      snippet: a.content || '',
    }));
}

function parseSearchResults(content: string): WebSearchResult[] {
  const results: WebSearchResult[] = [];
  if (!content) return results;

  // Try to extract URLs and their surrounding context
  const urlRegex = /https?:\/\/[^\s\])"<>]+/g;
  const urls = content.match(urlRegex) || [];
  const lines = content.split('\n').filter((l) => l.trim().length > 0);

  if (urls.length === 0) {
    // No URLs found — return the whole content as a single result
    if (content.trim().length > 10) {
      results.push({
        title: 'Web Search Summary',
        url: '',
        snippet: content.substring(0, 500),
      });
    }
    return results;
  }

  // Extract results around each URL
  const seenUrls = new Set<string>();
  for (const url of urls) {
    if (seenUrls.has(url)) continue;
    seenUrls.add(url);

    // Find the line containing this URL
    const lineIndex = lines.findIndex((l) => l.includes(url));
    let title = 'Untitled';
    let snippet = '';

    if (lineIndex >= 0) {
      // Try to extract a title from the same or previous line
      const currentLine = lines[lineIndex];
      const markdownTitle = currentLine.match(/\[([^\]]+)\]/);
      if (markdownTitle) {
        title = markdownTitle[1];
      } else if (lineIndex > 0) {
        // Use the previous line as title if it looks like a heading
        const prevLine = lines[lineIndex - 1].replace(/^[#*\-\d.]+\s*/, '').trim();
        if (prevLine.length > 3 && prevLine.length < 200) {
          title = prevLine;
        }
      }

      // Get snippet from the line after the URL
      if (lineIndex + 1 < lines.length) {
        snippet = lines[lineIndex + 1].replace(/^[#*\-\d.]+\s*/, '').trim();
      }

      if (!snippet && currentLine) {
        snippet = currentLine
          .replace(url, '')
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
          .trim();
      }
    }

    results.push({ title, url, snippet });
    if (results.length >= MAX_SEARCH_RESULTS) break;
  }

  return results;
}

// ─── Context Builder ─────────────────────────────────────────────────────────

/**
 * Builds a formatted search context string to inject into the LLM prompt.
 */
export function buildSearchContext(results: WebSearchResult[]): string {
  if (!results || results.length === 0) return '';

  let context = '\n\n=== WEB SEARCH RESULTS ===\n';

  results.forEach((result, index) => {
    if (result.url) {
      context += `\n[Source ${index + 1}: ${result.title}](${result.url})\n`;
    } else {
      context += `\n[Source ${index + 1}: ${result.title}]\n`;
    }
    if (result.snippet) {
      context += `${result.snippet}\n`;
    }
  });

  context += '\n==========================\n';
  context += '\nUse the search results provided above to answer the user\'s query comprehensively and accurately. ';
  context += 'Always cite your sources using the [Source X: Title](URL) format when referencing the data.';

  return context;
}
