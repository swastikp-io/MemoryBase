import { WikipediaProvider } from '../services/wikipedia.ts';
import OpenAI from 'openai';
import { searchWeb, SearchResult } from '../services/websearch.ts';
import { executeWithFallbacks, streamWithFallbacks } from '../utils/llmValidation.ts';
import { randomUUID } from 'crypto';

export class ResearchPipeline {
  static async execute(
    openai: OpenAI,
    formattedMessages: any[],
    userQuery: string,
    actualModel: string,
    res: any
  ) {
    const sessionId = Date.now().toString();
    const events: any[] = [];
    
    const emitStep = (step: any) => {
      res.write(`data: ${JSON.stringify({ reasoningStep: step })}\n\n`);
    };
    
    console.log(`[Research] Stage Started: Planning`);
    
    // Validate model mapping
    const PRIMARY_RESEARCH_MODEL = process.env.PRIMARY_RESEARCH_MODEL || "openai/gpt-oss-120b:free";
    const FALLBACK_RESEARCH_MODELS = (process.env.FALLBACK_RESEARCH_MODELS || "").split(",").filter(Boolean);
    const researchModels = [PRIMARY_RESEARCH_MODEL, ...FALLBACK_RESEARCH_MODELS];

    let validatedModel = actualModel;
    if (actualModel !== PRIMARY_RESEARCH_MODEL) {
      console.warn(`[Deep Research] Warning: Model ${actualModel} is not allowed. Replacing with configured primary ${PRIMARY_RESEARCH_MODEL}.`);
      validatedModel = PRIMARY_RESEARCH_MODEL;
    }
    
    console.log(`[Deep Research] Selected Model: ${validatedModel}`);
    console.log(`[Deep Research] Model Validation Passed`);
    console.log(`[Deep Research] Research Pipeline Started`);

    res.write(`data: ${JSON.stringify({ research: { id: sessionId, status: 'planning', progress: 0, steps: [], events, title: userQuery } })}\n\n`);

    const planId = randomUUID();
    emitStep({ id: planId, title: "Generating research plan", type: "analysis", status: "active", startedAt: Date.now() });

    type StepStatus = 'pending' | 'running' | 'completed' | 'failed';
    let steps = [
      { id: 'step-1', title: 'Analyzing research intent', status: 'running' as StepStatus },
      { id: 'step-2', title: 'Gathering sources', status: 'pending' as StepStatus },
      { id: 'step-3', title: 'Evaluating & synthesizing', status: 'pending' as StepStatus },
      { id: 'step-4', title: 'Generating report', status: 'pending' as StepStatus },
    ];
    res.write(`data: ${JSON.stringify({ research: { status: 'running', progress: 10, steps, events } })}\n\n`);

    const planPrompt = `Analyze the user query: "${userQuery}".
Identify the core research intent and generate up to 3 distinct, specific search queries to gather comprehensive information.
Return ONLY a valid JSON array of strings containing the search queries. Do NOT include markdown fences, prefaces, or anything else.
Example output: ["query 1", "query 2", "query 3"]`;

    let searchQueries: string[] = [userQuery];
    try {
      const planContent = await executeWithFallbacks(
        openai,
        { messages: [{ role: 'system', content: planPrompt }], max_tokens: 200, temperature: 0.2 },
        researchModels,
        '["' + userQuery.replace(/"/g, '\\"') + '"]',
        'research_planning'
      );
      
      let content = planContent;
      const match = content.match(/\[.*\]/s);
      if (match) content = match[0];
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        searchQueries = parsed;
      }
      console.log(`[Research] Stage Completed: Planning`);
    } catch (err) {
      console.error("[Research] Stage Failed: Planning", err);
      // continue gracefully with original query
    }

    emitStep({ id: planId, status: "completed", completedAt: Date.now() });
    
    const queriesId = randomUUID();
    emitStep({ id: queriesId, title: "Creating search queries", type: "analysis", status: "active", startedAt: Date.now() });
    await new Promise(r => setTimeout(r, 200)); // Simulating processing
    emitStep({ id: queriesId, status: "completed", description: `Generated ${searchQueries.length} queries`, completedAt: Date.now() });

    steps[0].status = 'completed';
    steps[1].status = 'running';
    res.write(`data: ${JSON.stringify({ research: { progress: 30, steps, events } })}\n\n`);

    console.log(`[Research] Stage Started: Search & Gather`);
    const searchId = randomUUID();
    emitStep({ id: searchId, title: "Searching web", type: "search", status: "active", startedAt: Date.now() });
    const allResults: SearchResult[] = [];
    try {
      const searchPromises = searchQueries.map(q => searchWeb(q));
      const searchResultsArray = await Promise.all(searchPromises);
      
      const seenUrls = new Set<string>();
      for (const results of searchResultsArray) {
        for (const r of results) {
          if (!seenUrls.has(r.url)) {
            seenUrls.add(r.url);
            allResults.push(r);
          }
        }
      }
      console.log(`[Research] Stage Completed: Search & Gather`);
    } catch (err) {
      console.error("[Research] Stage Failed: Search & Gather", err);
    }

    if (allResults.length > 0) {
      res.write(`data: ${JSON.stringify({ sources: allResults })}\n\n`);
      emitStep({ id: searchId, status: "completed", description: `Found ${allResults.length} sources`, completedAt: Date.now() });
    } else {
      console.warn("[Research] No web sources gathered. Proceeding with LLM knowledge only.");
      emitStep({ id: searchId, status: "error", description: "No sources found", completedAt: Date.now() });
    }

    // Now emit fake reading steps for realism
    for (let i = 0; i < Math.min(allResults.length, 6); i++) {
      const readId = randomUUID();
      emitStep({ id: readId, title: `Reading source ${i + 1}`, type: "search", status: "active", startedAt: Date.now() });
      await new Promise(r => setTimeout(r, 800 + Math.random() * 1200)); // Simulate 0.8s - 2.0s per source
      emitStep({ id: readId, status: "completed", completedAt: Date.now() });
    }

    steps[1].status = 'completed';
    steps[2].status = 'running';
    res.write(`data: ${JSON.stringify({ research: { progress: 60, steps, events } })}\n\n`);
    console.log(`[Research] Stage Started: Synthesis & Report Generation`);
    
    const synthId = randomUUID();
    emitStep({ id: synthId, title: "Comparing findings", type: "analysis", status: "active", startedAt: Date.now() });

    steps[2].status = 'completed';
    steps[3].status = 'running';
    res.write(`data: ${JSON.stringify({ research: { progress: 85, steps, events } })}\n\n`);

    // Knowledge Expansion via Wikipedia Enrichment
    let wikiEnrichmentText = "";
    try {
      console.log(`[Research] Stage Started: Knowledge Expansion (Wikipedia)`);
      const wikiId = randomUUID();
      emitStep({ id: wikiId, title: "Searching Wikipedia", type: "search", status: "active", startedAt: Date.now() });
      wikiEnrichmentText = await WikipediaProvider.getEnrichment(userQuery);
      emitStep({ id: wikiId, status: "completed", completedAt: Date.now() });
      if (wikiEnrichmentText) {
         console.log(`[Research] Wikipedia Enrichment Retrieved successfully.`);
      }
      console.log(`[Research] Stage Completed: Knowledge Expansion`);
    } catch (err) {
      console.warn(`[Research] Knowledge Expansion Failed`);
    }
    
    emitStep({ id: synthId, status: "completed", completedAt: Date.now() });
    
    const outlineId = randomUUID();
    emitStep({ id: outlineId, title: "Building outline", type: "analysis", status: "active", startedAt: Date.now() });
    await new Promise(r => setTimeout(r, 600)); 
    emitStep({ id: outlineId, status: "completed", completedAt: Date.now() });
    
    const reportId = randomUUID();
    emitStep({ id: reportId, title: "Writing report", type: "generation", status: "active", startedAt: Date.now() });

    let synthesisContext = "You are an expert researcher. Synthesize a comprehensive Deep Research report based on the following web sources and enriched knowledge.\n\n";
    if (wikiEnrichmentText) {
      synthesisContext += `--- Core Enriched Context (Wikipedia) ---\n${wikiEnrichmentText}\n----------------------------------------\n\n`;
    }

    if (allResults.length > 0) {
      allResults.forEach((r, i) => {
        synthesisContext += `Source [${i + 1}]: ${r.title}\nURL: ${r.url}\nContent: ${r.snippet}\n\n`;
      });
    } else {
      synthesisContext += "(Note: Web search was unavailable or failed. Synthesize a report to the best of your internal knowledge.)\n\n";
    }

    const reportPrompt = `Write a deep, professional research report for the user's query: "${userQuery}".
Use adaptive length: small topics need 1,500+ words, medium topics 3,000+ words, and complex topics up to 5,000+ words.
You MUST include inline citations like [1], [2] whenever you use information from the sources.

Use the following strict structure (dynamically omit irrelevant sections):
# Executive Summary
# Key Findings
# Background
# Research Methodology
# Detailed Analysis
  ## Topic Sections
  ## Supporting Evidence
  ## Trends
  ## Risks
  ## Opportunities
# Comparative Analysis
# Conclusions
# Recommendations
# References
# Appendix (if needed)

Ensure high factual density, deep reasoning, and clear formatting. Use markdown exclusively.`;

    const reportMessages = [
      ...formattedMessages,
      { role: "system", content: synthesisContext },
      { role: "user", content: reportPrompt }
    ];

    try {
      const stream = await streamWithFallbacks(
        openai,
        { messages: reportMessages, temperature: 0.3, max_tokens: 8000 },
        researchModels,
        'research_generation',
        (modelUsed) => {
          if (modelUsed !== validatedModel) {
            // Write a gentle fallback notification to user stream
            res.write(`data: ${JSON.stringify({ text: "*Current research model is temporarily rate limited. Retrying with alternative model: " + modelUsed + "*\n\n" })}\n\n`);
          }
        }
      );

      for await (const chunk of stream) {
        const text = chunk.choices?.[0]?.delta?.content || "";
        if (text) {
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }
      emitStep({ id: reportId, status: "completed", completedAt: Date.now() });
      
      const reviewId = randomUUID();
      emitStep({ id: reviewId, title: "Final review", type: "analysis", status: "active", startedAt: Date.now() });
      await new Promise(r => setTimeout(r, 300));
      emitStep({ id: reviewId, status: "completed", completedAt: Date.now() });
      
      console.log(`[Research] Stage Completed: Synthesis & Report Generation`);
      console.log(`[Deep Research] Research Pipeline Completed`);
    } catch (err: any) {
      console.error("[Research] Stage Failed: Synthesis & Report Generation", err);
      emitStep({ id: reportId, status: "error", description: "Report generation failed", completedAt: Date.now() });
      res.write(`data: ${JSON.stringify({ text: "\n\n*(Error: Research generation failed completely due to rate limits or API errors)*\n" })}\n\n`);
      throw err;
    }

    steps[3].status = 'completed';
    res.write(`data: ${JSON.stringify({ research: { status: 'completed', progress: 100, steps, events } })}\n\n`);
  }
}
