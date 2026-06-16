import OpenAI from 'openai';
import { injectContext } from './contextInjector.ts';
import { withRetriesAndFallback } from '../utils/llmValidation.ts';
import { ProviderLogger } from '../utils/providerLogger.ts';
import { PersonalizationService } from '../personalization/personalizationService.ts';
import { getSystemPrompt, getPlanPrompt, critiquePrompt, improvePrompt } from './prompts/router.ts';
import { searchWeb, buildSearchContext } from '../services/websearch.ts';

import { MODEL_BEHAVIORS } from '../../src/lib/model-behaviors.ts';
import { resolveModel } from '../../src/lib/models/resolver.ts';

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

    // Inject previous conversation / context summarization
    let formattedMessages = await injectContext(userId, accessToken, messages) as any[];

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
      try {
        // Signal the frontend that a search is in progress
        res.write(`data: ${JSON.stringify({ isSearchingWeb: true })}\n\n`);

        const searchResults = await searchWeb(userQuery);

        if (searchResults.length > 0) {
          const searchContext = buildSearchContext(searchResults);

          // Append search context to the system message
          if (formattedMessages.length > 0 && formattedMessages[0].role === 'system') {
            formattedMessages[0].content += searchContext;
          } else {
            formattedMessages.unshift({ role: 'system', content: searchContext });
          }
          
          res.write(`data: ${JSON.stringify({ sources: searchResults })}\n\n`);
        }
      } catch (searchError: unknown) {
        const errorMsg = searchError instanceof Error ? searchError.message : 'Unknown search error';
        console.error('[ReasoningController] Web search failed gracefully:', errorMsg);
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
          try {
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
          } catch (e) {
            console.error("[ReasoningController] Planning phase failed:", e);
          }
        }

        const standardStreamStart = performance.now();
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
        const sessionId = Date.now().toString();
        res.write(`data: ${JSON.stringify({ research: { id: sessionId, status: 'planning', progress: 0, steps: [], events: [], title: userQuery } })}\n\n`);
        
        let requestCount = 0;

        const comprehensivePrompt = `You are conducting a complete deep research task.
You must return the entire research session in exactly ONE JSON response.
Do not output any markdown formatting like \`\`\`json around the response, just return the raw JSON object.

Use this EXACT JSON structure:
{
  "plan": [
    {
      "title": "Clear concise step title",
      "description": "Short description of what is researched"
    }
  ],
  "findings": [
    {
      "step": "Step title",
      "content": "Detailed findings for this step",
      "sources": ["source 1", "source 2"]
    }
  ],
  "summary": "Brief summary of the research",
  "finalReport": "Your complete, comprehensive final research report containing all synthesized findings and sources in markdown format. This should be very detailed.",
  "sources": ["List of all sources used"]
}
`;
        
        requestCount++;
        console.log(`Research Session LLM Calls: ${requestCount}`);
        
        const fullContent = await withRetriesAndFallback(
          openai,
          {
            model: actualModel,
            messages: [
              ...formattedMessages, 
              { role: "user", content: comprehensivePrompt }
            ],
            max_tokens: 8000,
            temperature: 0.7
          },
          "{}",
          2,
          'research'
        );
        
        let parsedData: any = {
          plan: [{ title: "Analyze query" }, { title: "Synthesize findings" }, { title: "Generate report" }],
          finalReport: "Failed to parse research data. Raw output:\n\n" + fullContent
        };

        try {
          // Attempt to extract JSON if it was wrapped in markdown
          const jsonMatch = fullContent.match(/```(?:json)?\n([\s\S]*?)\n```/i) || fullContent.match(/\{[\s\S]*\}/);
          const rawJson = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : fullContent;
          parsedData = JSON.parse(rawJson);
        } catch (e) {
          console.error("Failed to parse single-request deep research JSON:", e);
        }

        const steps: any[] = (parsedData.plan || parsedData.planText || parsedData.steps || parsedData.planArray || []).map((p: any, i: number) => {
          let cleanTitle = typeof p === 'string' ? p : (p.title || `Step ${i + 1}`);
          cleanTitle = cleanTitle.replace(/\*\*/g, '').replace(/__/g, '').replace(/`/g, '').replace(/^#+\s*/, '').trim();
          return {
            id: `step-${i}`,
            title: cleanTitle,
            status: 'pending'
          };
        });
        
        if (steps.length === 0) {
          steps.push({ id: 'step-0', title: 'Synthesize findings', status: 'pending' });
        }
        
        let events: any[] = []; // Empty events array since Activity Panel is removed
        
        res.write(`data: ${JSON.stringify({ research: { status: 'running', steps, events } })}\n\n`);
        
        for (let i = 0; i < steps.length; i++) {
          steps[i].status = 'running';
          res.write(`data: ${JSON.stringify({ research: { steps, events, progress: (i / steps.length) * 100 } })}\n\n`);
          
          await new Promise(r => setTimeout(r, 800 + Math.random() * 800)); // 0.8-1.6s delay
          
          steps[i].status = 'completed';
          res.write(`data: ${JSON.stringify({ research: { steps, events, progress: ((i + 1) / steps.length) * 100 } })}\n\n`);
        }
        
        res.write(`data: ${JSON.stringify({ research: { status: 'completed', events } })}\n\n`);
        
        // Stream final report for visual effect
        const reportText = parsedData.finalReport || parsedData.report || parsedData.summary || fullContent;
        const chunkSize = 15;
        for (let i = 0; i < reportText.length; i += chunkSize) {
          const chunk = reportText.slice(i, i + chunkSize);
          res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
          await new Promise(r => setTimeout(r, 10)); // rapid streaming delay
        }
        
        const fullMessages = [...messages, { role: "assistant", content: reportText }];
        return;
      }

      // Step 1: Internal Plan
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
      
      res.write(`data: ${JSON.stringify({ reasoning: { plan } })}\n\n`);
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

      res.write(`data: ${JSON.stringify({ reasoning: { status: "Completed", isComplete: true } })}\n\n`);

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
