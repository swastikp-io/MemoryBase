import OpenAI from 'openai';
import { injectContext } from './contextInjector.ts';
import { PersonalizationService } from '../personalization/personalizationService.ts';
import { OrchestratorPrompts } from './prompts.ts';
import { searchWebNative, buildSearchContext } from '../services/search/openrouter-search.ts';

import type { WebSearchResult } from '../services/search/openrouter-search.ts';

export class ReasoningController {
  static async execute(
    openai: OpenAI, 
    userId: string,
    accessToken: string,
    messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }>, 
    model: string, 
    res: {
      write: (chunk: string) => boolean;
    },
    userEmail: string = "unknown@example.com"
  ) {
    const isResearch = model === "research" || model === "google/gemma-4-31b-it:free";
    const isCoding = model === "coding" || model === "moonshotai/kimi-k2.6:free";
    let actualModel = "openai/gpt-oss-120b:free";
    let systemPrompt = OrchestratorPrompts.reasoningSystemPrompt;
    
    if (isResearch) {
      actualModel = "google/gemma-4-31b-it:free";
      systemPrompt = OrchestratorPrompts.researchSystemPrompt;
    } else if (isCoding) {
      actualModel = "moonshotai/kimi-k2.6:free";
      systemPrompt = OrchestratorPrompts.codingSystemPrompt;
    }
    
    // Inject previous conversation / context summarization
    const formattedMessages = await injectContext(userId, accessToken, messages);

    const userQueryMessage = formattedMessages[formattedMessages.length - 1];
    let userQuery = "";
    if (userQueryMessage) {
      if (typeof userQueryMessage.content === 'string') {
        userQuery = userQueryMessage.content;
      } else if (Array.isArray(userQueryMessage.content)) {
        const textPart = userQueryMessage.content.find(
          (c: { type: string; text?: string }) => c.type === 'text'
        );
        userQuery = textPart?.text || "Attached media";
      }
    }

    // ─── Automatic Web Search (OpenRouter) ──────────────────────────────
    // Every user message triggers a transparent web search.
    // If the search fails, we gracefully continue without blocking.
    if (userQuery) {
      try {
        // Signal the frontend that a search is in progress
        res.write(`data: ${JSON.stringify({ isSearchingWeb: true })}\n\n`);

        const searchResults: WebSearchResult[] = await searchWebNative(openai, userQuery);

        if (searchResults.length > 0) {
          const searchContext = buildSearchContext(searchResults);

          // Append search context to the system message
          if (formattedMessages.length > 0 && formattedMessages[0].role === 'system') {
            formattedMessages[0].content += searchContext;
          } else {
            formattedMessages.unshift({ role: 'system', content: searchContext });
          }
        }
      } catch (searchError: unknown) {
        const errorMsg = searchError instanceof Error ? searchError.message : 'Unknown search error';
        console.error('[ReasoningController] Web search failed gracefully:', errorMsg);
        // Continue without search results — do not block the response
      }
    }

    try {
      // Append the actual system prompt
      if (formattedMessages.length > 0 && formattedMessages[0].role === 'system') {
        formattedMessages[0].content = systemPrompt + "\n\n" + formattedMessages[0].content;
      } else {
        formattedMessages.unshift({ role: 'system', content: systemPrompt });
      }

      // Step 1: Internal Plan
      res.write(`data: ${JSON.stringify({ reasoning: { status: "Thinking...", step: "Planning" } })}\n\n`);
      
      let planPrompt = OrchestratorPrompts.reasoningPlanPrompt;
      if (isResearch) {
        planPrompt = OrchestratorPrompts.researchPlanPrompt;
      } else if (isCoding) {
        planPrompt = OrchestratorPrompts.codingPlanPrompt;
      }
      const planResponse = await openai.chat.completions.create({
        model: actualModel,
        messages: [...formattedMessages, { role: "user", content: planPrompt }],
      });
      const plan = planResponse.choices[0]?.message?.content || "Plan generated.";
      
      res.write(`data: ${JSON.stringify({ reasoning: { plan } })}\n\n`);
      res.write(`data: ${JSON.stringify({ reasoning: { status: "Analyzing...", step: "Drafting" } })}\n\n`);

      // Step 2: Draft Output
      const draftResponse = await openai.chat.completions.create({
        model: actualModel,
        messages: [
          ...formattedMessages, 
          { role: "assistant", content: plan },
          { role: "user", content: "Now write the complete draft following the format requested." }
        ],
      });
      const draft = draftResponse.choices[0]?.message?.content || "";

      res.write(`data: ${JSON.stringify({ reasoning: { status: "Reviewing...", step: "Critiquing" } })}\n\n`);

      // Step 3: Critique
      const critiqueResponse = await openai.chat.completions.create({
        model: actualModel,
        messages: [
          ...formattedMessages, 
          { role: "assistant", content: draft },
          { role: "user", content: OrchestratorPrompts.critiquePrompt }
        ],
      });
      const critique = critiqueResponse.choices[0]?.message?.content || "";

      res.write(`data: ${JSON.stringify({ reasoning: { status: "Completed", isComplete: true } })}\n\n`);

      // Step 4: Final Stream
      const finalStream = await openai.chat.completions.create({
        model: actualModel,
        messages: [
          ...formattedMessages, 
          { role: "assistant", content: `Draft:\n${draft}\n\nCritique:\n${critique}` },
          { role: "user", content: OrchestratorPrompts.improvePrompt }
        ],
        stream: true
      });

      for await (const chunk of finalStream) {
        const text = chunk.choices[0]?.delta?.content || "";
        if (text) {
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }

      return;
    } catch (error: unknown) {
      const errorObj = error as { status?: number; message?: string };
      if (errorObj?.status === 429 || errorObj?.message?.includes("429") || errorObj?.message?.includes("RateLimitError")) {
        console.warn(`[ReasoningController] Rate limit exceeded (429).`);
        const errorResponse = "\\n\\n*(Error: Provider rate limit exceeded. Please wait a moment and try again.)*";
        res.write(`data: ${JSON.stringify({ text: errorResponse })}\n\n`);
      } else {
        console.error("Reasoning Controller Error:", error);
        
        let errorMsg = errorObj?.message || "Unknown";
        if (errorObj?.status === 401 || errorMsg.includes("401") || errorMsg.includes("Missing Authentication header") || errorMsg.includes("Invalid Authentication header")) {
          errorMsg = "Unauthorized. Please ensure your OpenRouter API Key is entered correctly in the .env file.";
        }

        const errorResponse = "\\n\\n*(Error executing reasoning network: " + errorMsg + ")*";
        res.write(`data: ${JSON.stringify({ text: errorResponse })}\n\n`);
      }
    }
  }
}
