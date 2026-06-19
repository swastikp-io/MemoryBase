import OpenAI from 'openai';
import { randomUUID } from 'crypto';
import { injectContext } from './contextInjector.ts';
import { withRetriesAndFallback } from '../utils/llmValidation.ts';
const ProviderLogger = { log: (x: any) => {} };
import { PersonalizationService } from '../personalization/personalizationService.ts';
import { getSystemPrompt, getPlanPrompt, critiquePrompt, improvePrompt } from './prompts/router.ts';
import { searchWeb, buildSearchContext } from '../services/websearch.ts';

import { MODEL_BEHAVIORS } from '../../src/lib/model-behaviors.ts';
import { resolveModel } from '../../src/lib/models/resolver.ts';
import { ResearchPipeline } from './researchPipeline.ts';

export class ReasoningController {
  static async execute(
    openai: OpenAI, 
    userId: string,
    accessToken: string,
    messages: Array<{ role: string; content: string; images?: string[] }>, 
    mode: string,
    webSearch: boolean,
    res: {
      write: (chunk: string) => boolean;
    },
    userEmail: string = "unknown@example.com"
  ) {
    let userQuery = "";
    const latestUserMessage = [...messages].reverse().find(message => message.role === 'user');
    if (latestUserMessage) {
      userQuery = typeof latestUserMessage.content === 'string' ? latestUserMessage.content : JSON.stringify(latestUserMessage.content);
    }

    const requestId = Date.now().toString();

    const emitStep = (step: any) => {
      res.write(`data: ${JSON.stringify({ reasoningStep: step })}\n\n`);
    };

    const understandId = randomUUID();
    emitStep({ id: understandId, title: "Understanding request", type: "system", status: "active", startedAt: Date.now() });
    
    // Simulate tiny delay for realistic trace
    await new Promise(r => setTimeout(r, 120));
    emitStep({ id: understandId, status: "completed", completedAt: Date.now() });

    const modeId = randomUUID();
    emitStep({ id: modeId, title: "Detecting mode", type: "system", status: "active", startedAt: Date.now() });
    await new Promise(r => setTimeout(r, 80));
    emitStep({ id: modeId, status: "completed", description: `Selected mode: ${mode}`, completedAt: Date.now() });

    const contextId = randomUUID();
    emitStep({ id: contextId, title: "Building context", type: "memory", status: "active", startedAt: Date.now() });

    // Inject previous conversation / context summarization
    let formattedMessages = await injectContext(userId, accessToken, messages) as any[];
    
    emitStep({ id: contextId, status: "completed", completedAt: Date.now() });

    const actualModel = resolveModel(mode as any);
    
    let systemPrompt = getSystemPrompt(mode);
    const isCoding = mode === 'coding';
    const isResearch = mode === 'research';

    if (isCoding) {
      
      // Automatic Prompt Injection Layer
      const promptInjection = "[PARALEX CODING MODE ACTIVE]\n\nGenerate implementation first.\nReturn executable code.\nAvoid research-style responses.\nKeep explanations minimal.\nAct as a senior software engineer.\n\n";
      if (formattedMessages.length > 0) {
        const lastMsg = formattedMessages[formattedMessages.length - 1];
        if (lastMsg.role === 'user' && typeof lastMsg.content === 'string') {
          lastMsg.content = promptInjection + lastMsg.content;
        }
      }
    }

    // ─── Web Search API (User Triggered) ──────────────────────────────
    if (webSearch && userQuery) {
      const searchId = randomUUID();
      try {
        // Signal the frontend that a search is in progress
        res.write(`data: ${JSON.stringify({ isSearchingWeb: true })}\n\n`);
        emitStep({ id: searchId, title: "Searching the web", type: "search", status: "active", startedAt: Date.now() });

        const searchResults = await searchWeb(userQuery);

        if (searchResults.length > 0) {
          const searchContext = buildSearchContext(searchResults);
          emitStep({ id: searchId, status: "completed", description: `Collected ${searchResults.length} sources`, completedAt: Date.now() });

          // Append search context to the system message
          if (formattedMessages.length > 0 && formattedMessages[0].role === 'system') {
            formattedMessages[0].content += searchContext;
          } else {
            formattedMessages.unshift({ role: 'system', content: searchContext });
          }
          
          res.write(`data: ${JSON.stringify({ sources: searchResults })}\n\n`);
        } else {
          emitStep({ id: searchId, status: "completed", description: "No sources found", completedAt: Date.now() });
        }
      } catch (searchError: unknown) {
        const errorMsg = searchError instanceof Error ? searchError.message : 'Unknown search error';
        console.error('[ReasoningController] Web search failed gracefully:', errorMsg);
        emitStep({ id: searchId, status: "error", description: "Search failed", completedAt: Date.now() });
      }
    }

    try {
      // Append the actual system prompt
      if (formattedMessages.length > 0 && formattedMessages[0].role === 'system') {
        formattedMessages[0].content = systemPrompt + "\n\n" + formattedMessages[0].content;
      } else {
        formattedMessages.unshift({ role: 'system', content: systemPrompt });
      }

      if (mode === 'standard') {
        if (userQuery) {
          const planId = randomUUID();
          try {
            emitStep({ id: planId, title: "Analyzing request", type: "analysis", status: "active", startedAt: Date.now() });
            const planPrompt = `Analyze the following user query: "${userQuery}"
            
Generate a brief response plan. Output ONLY the plan in the following exact text format, with no markdown formatting around it:
Topic: [Main topic]
Complexity: [LOW/MEDIUM/HIGH] (LOW for simple factual like "Capital of India", MEDIUM for explanations like "What is JSON", HIGH for comparisons or complex topics)
Depth: [Short/Medium/Long]
Sections: [Section 1, Section 2, ...]`;

            const fallbackPlan = "Topic: General\nComplexity: MEDIUM\nDepth: Short\nSections:\n- Main Response";
            const responsePlan = await withRetriesAndFallback(
              openai,
              {
                model: actualModel,
                messages: [{ role: "system", content: planPrompt }],
                max_tokens: 150,
                temperature: 0.3
              },
              fallbackPlan,
              2,
              'planning'
            );
            
            console.log("DEBUG value:", responsePlan);
            if (responsePlan) {
              formattedMessages[0].content += "\n\n[RESPONSE PLAN]\n" + responsePlan + "\n\nPlease ensure your response strictly follows this structure and depth comprehensively. Do not artificially shorten your answer.";
            }
            emitStep({ id: planId, status: "completed", description: "Created response plan", completedAt: Date.now() });
          } catch (e) {
            console.error("[ReasoningController] Planning phase failed:", e);
            emitStep({ id: planId, status: "error", description: "Failed to analyze request", completedAt: Date.now() });
          }
        }

        const genId = randomUUID();
        emitStep({ id: genId, title: "Generating response", type: "generation", status: "active", startedAt: Date.now() });

        const standardStreamStart = performance.now();
        console.log(`[ReasoningController] Initiating standard stream [requestId: ${requestId}] - Model: ${actualModel}`);
        let standardStream;
        try {
          standardStream = await openai.chat.completions.create({
            model: actualModel,
            messages: formattedMessages,
            stream: true,
            temperature: 0.7,
            max_tokens: 2500
          });
        } catch (streamErr: any) {
          ProviderLogger.log({
            provider: 'openrouter',
            model: actualModel,
            request_type: 'chat_stream',
            success: false,
            error_message: streamErr.message,
            latency_ms: performance.now() - standardStreamStart
          });
          throw streamErr;
        }

        let finalOutput = "";
        let firstTokenTime = 0;
        try {
          for await (const chunk of standardStream) {
            if (!firstTokenTime) {
              firstTokenTime = performance.now() - standardStreamStart;
              console.log(JSON.stringify({ requestId, phase: 'first_token', durationMs: Math.round(firstTokenTime) }));
            }
            const text = chunk.choices?.[0]?.delta?.content || "";
            if (text) {
              finalOutput += text;
              res.write(`data: ${JSON.stringify({ text })}\n\n`);
            }
          }
        } catch (streamErr: any) {
          console.error("[ReasoningController] Stream interrupted:", streamErr);
          res.write(`data: ${JSON.stringify({ text: "\n\n*(Connection interrupted)*" })}\n\n`);
        }

        emitStep({ id: genId, status: "completed", completedAt: Date.now() });

        const finalId = randomUUID();
        emitStep({ id: finalId, title: "Finalizing answer", type: "system", status: "active", startedAt: Date.now() });
        await new Promise(r => setTimeout(r, 100)); // Small realistic delay
        emitStep({ id: finalId, status: "completed", completedAt: Date.now() });

        const standardStreamDuration = performance.now() - standardStreamStart;
        console.log(JSON.stringify({ requestId, phase: 'llm_request_complete', durationMs: Math.round(standardStreamDuration) }));
        ProviderLogger.log({
          provider: 'openrouter',
          model: actualModel,
          request_type: 'chat_stream',
          success: true,
          latency_ms: standardStreamDuration
        });

        const fullMessages = [
          ...messages,
          { role: "assistant", content: finalOutput }
        ];

        return;
      }

      if (mode === 'research') {
        await ResearchPipeline.execute(openai, formattedMessages, userQuery, actualModel, res);
        return;
      }

      // Step 1: Internal Plan
      const planId = randomUUID();
      emitStep({ id: planId, title: "Creating execution plan", type: "analysis", status: "active", startedAt: Date.now() });
      res.write(`data: ${JSON.stringify({ reasoning: { status: "Thinking...", step: "Planning" } })}\n\n`);
      
      let planPrompt = getPlanPrompt(mode);
      const plan = await withRetriesAndFallback(
        openai,
        {
          model: actualModel,
          messages: [...formattedMessages, { role: "user", content: planPrompt }],
        },
        "Topic: General\nComplexity: MEDIUM\nDepth: Short\nSections:\n- Main Response",
        2,
        'planning'
      );
      
      emitStep({ id: planId, status: "completed", completedAt: Date.now() });
      res.write(`data: ${JSON.stringify({ reasoning: { plan } })}\n\n`);
      
      const draftId = randomUUID();
      emitStep({ id: draftId, title: "Drafting response", type: "generation", status: "active", startedAt: Date.now() });
      res.write(`data: ${JSON.stringify({ reasoning: { status: "Analyzing...", step: "Drafting" } })}\n\n`);

      // Step 2: Draft Output
      const draft = await withRetriesAndFallback(
        openai,
        {
          model: actualModel,
          messages: [
            ...formattedMessages, 
            { role: "assistant", content: plan },
            { role: "user", content: "Now write the complete draft following the format requested." }
          ],
        },
        "I encountered a temporary issue while drafting a response. Please try again.",
        2,
        'drafting'
      );

      emitStep({ id: draftId, status: "completed", completedAt: Date.now() });
      
      const critiqueId = randomUUID();
      emitStep({ id: critiqueId, title: "Reviewing and critiquing", type: "analysis", status: "active", startedAt: Date.now() });
      res.write(`data: ${JSON.stringify({ reasoning: { status: "Reviewing...", step: "Critiquing" } })}\n\n`);

      // Step 3: Critique
      const critique = await withRetriesAndFallback(
        openai,
        {
          model: actualModel,
          messages: [
            ...formattedMessages, 
            { role: "assistant", content: draft },
            { role: "user", content: critiquePrompt }
          ],
        },
        "Critique bypassed due to provider issue.",
        2,
        'critique'
      );

      emitStep({ id: critiqueId, status: "completed", completedAt: Date.now() });
      res.write(`data: ${JSON.stringify({ reasoning: { status: "Completed", isComplete: true } })}\n\n`);

      const finalGenId = randomUUID();
      emitStep({ id: finalGenId, title: "Generating final output", type: "generation", status: "active", startedAt: Date.now() });

      // Step 4: Final Stream
      let temperature: number | undefined = undefined;
      let top_p: number | undefined = undefined;
      
      if (actualModel === "moonshotai/kimi-k2.6:free") {
        // @ts-ignore dynamic indexing
        temperature = MODEL_BEHAVIORS["kimi-k2.6"]?.temperature ?? 0.2;
        // @ts-ignore dynamic indexing
        top_p = MODEL_BEHAVIORS["kimi-k2.6"]?.top_p ?? 0.9;
      }

      const finalStreamStart = performance.now();
      console.log(`[ReasoningController] Initiating final reasoning stream [requestId: ${requestId}] - Model: ${actualModel}`);
      let finalStream;
      try {
        finalStream = await openai.chat.completions.create({
          model: actualModel,
          temperature,
          top_p,
          messages: [
            ...formattedMessages, 
            { role: "assistant", content: `Draft:\n${draft}\n\nCritique:\n${critique}` },
            { role: "user", content: improvePrompt }
          ],
          stream: true
        });
      } catch (streamErr: any) {
        ProviderLogger.log({
          provider: 'openrouter',
          model: actualModel,
          request_type: 'final_stream',
          success: false,
          error_message: streamErr.message,
          latency_ms: performance.now() - finalStreamStart
        });
        throw streamErr;
      }

      let finalOutput = "";
      let firstCodeBlockFound = false;
      let finalFirstTokenTime = 0;

      try {
        for await (const chunk of finalStream) {
          if (!finalFirstTokenTime) {
            finalFirstTokenTime = performance.now() - finalStreamStart;
            console.log(JSON.stringify({ requestId, phase: 'final_first_token', durationMs: Math.round(finalFirstTokenTime) }));
          }
          const text = chunk.choices?.[0]?.delta?.content || "";
          if (text) {
            finalOutput += text;
            
            if (isCoding && !firstCodeBlockFound) {
              if (finalOutput.includes("\`\`\`")) {
                firstCodeBlockFound = true;
              } else {
                const wordCount = finalOutput.trim().split(/\s+/).length;
                if (wordCount > 500) {
                  // Fallback Protection: Stop current generation, trigger prompt rewrite
                  const fallbackResponse = await openai.chat.completions.create({
                    model: actualModel,
                    temperature: 0.1,
                    messages: [
                      ...formattedMessages,
                      { role: "user", content: "Provide code only. Minimize explanations. Focus on implementation." }
                    ],
                    stream: true
                  });
                  for await (const fallbackChunk of fallbackResponse) {
                    const fallbackText = fallbackChunk.choices?.[0]?.delta?.content || "";
                    if (fallbackText) {
                      res.write(`data: ${JSON.stringify({ text: fallbackText })}\n\n`);
                    }
                  }
                  
                  const finalStreamDurationFallback = performance.now() - finalStreamStart;
                  ProviderLogger.log({
                    provider: 'openrouter',
                    model: actualModel,
                    request_type: 'final_stream',
                    success: true,
                    latency_ms: finalStreamDurationFallback
                  });
                  return;
                }
              }
            }
            
            res.write(`data: ${JSON.stringify({ text })}\n\n`);
          }
        }
      } catch (streamErr: any) {
        console.error("[ReasoningController] Final stream interrupted:", streamErr);
        res.write(`data: ${JSON.stringify({ text: "\n\n*(Connection interrupted)*" })}\n\n`);
      }

      emitStep({ id: finalGenId, status: "completed", completedAt: Date.now() });

      const finalizeId = randomUUID();
      emitStep({ id: finalizeId, title: "Finalizing answer", type: "system", status: "active", startedAt: Date.now() });
      await new Promise(r => setTimeout(r, 100)); // Small realistic delay
      emitStep({ id: finalizeId, status: "completed", completedAt: Date.now() });

      const finalStreamDuration = performance.now() - finalStreamStart;
      console.log(JSON.stringify({ requestId, phase: 'llm_request_complete', durationMs: Math.round(finalStreamDuration) }));
      ProviderLogger.log({
        provider: 'openrouter',
        model: actualModel,
        request_type: 'final_stream',
        success: true,
        latency_ms: finalStreamDuration
      });

      const fullMessages = [
        ...messages,
        { role: "assistant", content: finalOutput }
      ];

      return;
    } catch (error: unknown) {
      const errorObj = error as { status?: number; message?: string; stack?: string };
      console.error(`[ReasoningController] Fatal Execution Error [requestId: ${requestId}]:`, errorObj.stack || errorObj);
      
      if (errorObj?.status === 429 || errorObj?.message?.includes("429") || errorObj?.message?.includes("RateLimitError")) {
        console.warn(`[ReasoningController] Rate limit exceeded (429) [requestId: ${requestId}].`);
        const errorResponse = "\\n\\n*(Error: Provider rate limit exceeded. Please wait a moment and try again.)*";
        try { res.write(`data: ${JSON.stringify({ text: errorResponse })}\n\n`); } catch(e){}
      } else {
        let errorMsg = errorObj?.message || "Unknown";
        if (errorObj?.status === 401 || errorMsg.includes("401") || errorMsg.includes("Missing Authentication header") || errorMsg.includes("Invalid Authentication header")) {
          errorMsg = "Unauthorized. Please ensure your OpenRouter API Key is entered correctly in the .env file.";
        }

        const errorResponse = "\\n\\n*(Error executing reasoning network: " + errorMsg + ")*";
        try { res.write(`data: ${JSON.stringify({ text: errorResponse })}\n\n`); } catch(e){}
      }
    }
  }
}
