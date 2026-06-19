import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { WikipediaProvider } from '../services/wikipedia.ts';

// Mock global fetch
const originalFetch = global.fetch;

describe('WikipediaProvider', () => {
  beforeEach(() => {
    process.env.ENABLE_WIKIPEDIA_SEARCH = "true";
    process.env.ENABLE_WIKIPEDIA_ENRICHMENT = "true";
    process.env.WIKIPEDIA_CACHE_TTL = "1";
    // Setup a clean cache
    (WikipediaProvider as any).cache = undefined;
    WikipediaProvider.initCache();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('searches and formats wikipedia results correctly', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        query: {
          search: [
            { title: "Artificial Intelligence", snippet: "AI is a <span class=\"searchmatch\">field</span> of CS." }
          ]
        }
      })
    });

    const results = await WikipediaProvider.search("AI");
    expect(results.length).toBe(1);
    expect(results[0].title).toBe("Artificial Intelligence");
    expect(results[0].snippet).toBe("AI is a field of CS....");
    expect(results[0].url).toBe("https://en.wikipedia.org/wiki/Artificial_Intelligence");
    expect(results[0].isWikipedia).toBe(true);
  });

  it('extracts summary correctly for enrichment', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        type: "standard",
        title: "Artificial Intelligence",
        extract: "Artificial intelligence is intelligence demonstrated by machines."
      })
    });

    const summary = await WikipediaProvider.getEnrichment("Artificial Intelligence");
    expect(summary).toContain("Wikipedia Extract for Artificial Intelligence");
    expect(summary).toContain("intelligence demonstrated by machines");
  });

  it('gracefully handles timeout or fetch failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network timeout"));

    const results = await WikipediaProvider.search("AI");
    expect(results.length).toBe(0);

    const summary = await WikipediaProvider.getEnrichment("AI");
    expect(summary).toBe("");
  });

  it('handles caching properly', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        type: "standard",
        title: "Cache Test",
        extract: "Testing cache."
      })
    });
    global.fetch = fetchMock as any;

    await WikipediaProvider.getEnrichment("Cache Test");
    await WikipediaProvider.getEnrichment("Cache Test"); // Should hit cache
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
