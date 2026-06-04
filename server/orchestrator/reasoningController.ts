import OpenAI from 'openai';
import { injectContext } from './contextInjector.ts';
import { PersonalizationService } from '../personalization/personalizationService.ts';
import { OrchestratorPrompts } from './prompts.ts';

const webSearchRateLimits = new Map<string, number>();

export class ReasoningController {
  static async execute(
    openai: OpenAI, 
    userId: string,
    accessToken: string,
    messages: any[], 
    model: string, 
    searchWeb: boolean,
    res: any,
    userEmail: string = "unknown@example.com"
  ) {
    const formattedMessages = await injectContext(userId, accessToken, messages, searchWeb);
    
    // Get user personalization settings
    const userSettings = PersonalizationService.getSettings(userId);
    const maxCompletionTokens = 2000;

    // Extract the latest user query text (handling both string and array content formats)
    const userQueryMessage = formattedMessages[formattedMessages.length - 1];
    let userQuery = "";
    if (userQueryMessage) {
      if (typeof userQueryMessage.content === 'string') {
        userQuery = userQueryMessage.content;
      } else if (Array.isArray(userQueryMessage.content)) {
        userQuery = userQueryMessage.content.find((c: any) => c.type === 'text')?.text || "Attached media";
      }
    }

    if (searchWeb && userQuery) {
      const currentUsage = webSearchRateLimits.get(userEmail) || 0;
      
      if (currentUsage >= 2) {
        res.write(`data: ${JSON.stringify({ text: "Web Search rate limited exceeded" })}\n\n`);
        return;
      }
      
      // Increment the rate limit for this user
      webSearchRateLimits.set(userEmail, currentUsage + 1);

      try {
        const tavilyApiKey = process.env.TAVILY_API_KEY;
        if (!tavilyApiKey) {
          console.warn("Tavily API key is missing. Skipping web search.");
          res.write(`data: ${JSON.stringify({ text: "\\n\\n*(Warning: Web Search is enabled but TAVILY_API_KEY is not configured in the server environment.)*\\n\\n" })}\n\n`);
        } else {
          // Inform the user that a search is occurring via a clean JSON flag, no raw text
          res.write(`data: ${JSON.stringify({ isSearchingWeb: true })}\n\n`);

          const tavilyRes = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              api_key: tavilyApiKey,
              query: userQuery,
              search_depth: "basic",
              max_results: 5,
              include_images: false
            })
          });

          if (tavilyRes.ok) {
            const searchData = await tavilyRes.json();
            
            // Format the search results into a readable string for the LLM
            let searchContext = "\\n\\n=== WEB SEARCH RESULTS ===\\n";
            if (searchData.results && searchData.results.length > 0) {
              searchData.results.forEach((result: any, index: number) => {
                searchContext += `\\n[Source ${index + 1}: ${result.title || 'Untitled'}](${result.url})\\n`;
                searchContext += `${result.content}\\n`;
              });
              searchContext += "\\n==========================\\n\\nUse the search results provided above to answer the user's query comprehensively and accurately. Always cite your sources using the [Source X: Title](URL) format when referencing the data.";
              
              // Append to system prompt
              if (formattedMessages.length > 0 && formattedMessages[0].role === 'system') {
                formattedMessages[0].content += searchContext;
              } else {
                formattedMessages.unshift({ role: 'system', content: searchContext });
              }
            }
          } else {
             console.error("Tavily API failed with status:", tavilyRes.status);
          }
        }
      } catch (e) {
        console.error("Tavily Search Error:", e);
      }
    }

    try {
      // Fast Mode (Single Pass Linear) - Normal AI assistance
      const stream = await openai.chat.completions.create({
        model: model || "meta-llama/Meta-Llama-3-8B-Instruct",
        messages: formattedMessages as any,
        stream: true,
        max_tokens: maxCompletionTokens,
      });

      let fullResponse = "";
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || "";
        if (text) {
          fullResponse += text;
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }

      return;
    } catch (error: any) {
      if (error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("RateLimitError")) {
        console.warn(`[ReasoningController] Rate limit exceeded (429).`);
        const errorResponse = "\\n\\n*(Error: Provider rate limit exceeded. Please wait a moment and try again.)*";
        res.write(`data: ${JSON.stringify({ text: errorResponse })}\n\n`);
      } else {
        console.error("Reasoning Controller Error:", error);
        
        let errorMsg = error.message || "Unknown";
        if (error?.status === 401 || errorMsg.includes("401") || errorMsg.includes("Missing Authentication header") || errorMsg.includes("Invalid Authentication header")) {
          errorMsg = "Unauthorized. Please ensure your OpenRouter API Key is entered correctly in Settings.";
        }

        const errorResponse = "\\n\\n*(Error executing reasoning network: " + errorMsg + ")*";
        res.write(`data: ${JSON.stringify({ text: errorResponse })}\n\n`);
      }
    }
  }
}
