import { executeWithFallbacks } from './server/utils/llmValidation.ts';
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import OpenAI, { toFile } from "openai";
import dotenv from "dotenv";
import { ReasoningController } from "./server/orchestrator/reasoningController.ts";

import { resolveModel } from "./src/lib/models/resolver.ts";


dotenv.config();

const appUrl = process.env.APP_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "dummy_key",
});

// Environment Validation Helper
const checkEnvironment = (): string | null => {
  if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY === "dummy_key" || process.env.OPENROUTER_API_KEY.includes("your-openrouter-api-key")) {
    return "OPENROUTER_API_KEY is missing or invalid in environment variables.";
  }
  return null;
};



export const app = express();


app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));


export function setupRoutes() {

  // Diagnostic middleware for request parsing validation
  if (process.env.NODE_ENV !== "production") {
    app.use("/api", (req, res, next) => {
      console.log("========== REQUEST DEBUG ==========");
      console.log(`Endpoint: ${req.method} ${req.url}`);
      console.log("Content-Type:", req.headers["content-type"]);
      console.log("Body Type:", typeof req.body);
      console.log("Is Buffer:", Buffer.isBuffer(req.body));
      console.log("Is Array:", Array.isArray(req.body));
      console.log("Keys:", req.body ? Object.keys(req.body).join(", ") : "N/A");
      if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
        console.log("Messages Count:", req.body?.messages?.length);
        console.log("Mode:", req.body?.mode);
      }
      console.log("==================================");
      next();
    });
  }

  // API route for chat message streaming
  app.post("/api/chat", async (req, res) => {
    console.log(`[POST /api/chat] Request received. Body size: ${JSON.stringify(req.body).length} bytes`);
    const userId = "local-user";
    const accessToken = "mock-token";
    const { messages, mode, webSearch } = req.body;

    if (!messages || !Array.isArray(messages)) {
      console.error("[POST /api/chat] Validation failed: messages array is missing or invalid.");
      return res.status(400).json({ error: "Messages array is required" });
    }

    console.log(`[POST /api/chat] Processing request. Mode: ${mode}, Messages: ${messages.length}, WebSearch: ${Boolean(webSearch)}`);

    try {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();

      const envError = checkEnvironment();
      if (envError) {
        console.error(`[POST /api/chat] Environment Validation Error: ${envError}`);
        res.write(`data: ${JSON.stringify({ error: `Server Configuration Error: ${envError}` })}\n\n`);
        res.write("data: [DONE]\n\n");
        return res.end();
      }

      res.write(`data: ${JSON.stringify({ status: "connected" })}\n\n`);

      const currentOpenAI = openai;

      await ReasoningController.execute(currentOpenAI, userId, accessToken, messages, mode, Boolean(webSearch), res);
      res.write("data: [DONE]\n\n");
      res.end();

    } catch (error: any) {
      console.error("[POST /api/chat] OpenRouter API Error caught in top-level route handler:", error);
      let errorMessage = "An error occurred while communicating with the AI.";
      if (error && error.message) {
        if (error.status === 429 || error.message.includes("429") || error.message.includes("Quota exceeded") || error.message.includes("rate limit")) {
          errorMessage = "Rate limit exceeded. Check back after 24 hours.";
        } else if (error.status === 401 || error.message.includes("401")) {
          errorMessage = "Unauthorized. Please check your OpenRouter API Key in the Settings.";
        } else {
          errorMessage = "Error: " + error.message;
        }
      }

      // Ensure we don't crash and we actually stream the error down to the client.
      try {
        res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
        res.write("data: [DONE]\n\n");
        res.end();
      } catch (streamError) {
        console.error("[POST /api/chat] Failed to write error to stream:", streamError);
      }
    }
  });

  app.post("/api/chat/title", async (req, res) => {

    const { firstMessage, mode } = req.body;
    if (!firstMessage) {
      return res.status(400).json({ error: "firstMessage is required" });
    }

    try {
      const TITLE_MODEL = process.env.TITLE_GENERATION_MODEL || "openai/gpt-oss-120b:free";
      const FALLBACK_MODEL = process.env.TITLE_GENERATION_FALLBACK_MODEL || "google/gemma-3-27b-it:free";

      const localFallbackTitle = firstMessage.trim().split(/\s+/).slice(0, 5).join(" ") || "New Chat";

      const generatedTitle = await executeWithFallbacks(
        openai,
        {
          messages: [
            {
              role: "system",
              content: "You generate concise conversation titles.\nRules:\n- Maximum 6 words\n- No quotation marks\n- No punctuation unless necessary\n- Title Case\n- Descriptive\n- Professional\n- No filler words\nReturn only the title."
            },
            {
              role: "user",
              content: `Input:\n${firstMessage}`
            }
          ],
          temperature: 0.3,
          max_tokens: 30
        },
        [TITLE_MODEL, FALLBACK_MODEL],
        localFallbackTitle,
        'title_generation'
      );

      let cleanTitle = generatedTitle.replace(/["':\n]/g, "");
      if (cleanTitle.length > 60) cleanTitle = cleanTitle.substring(0, 60).trim();

      res.json({ title: cleanTitle });
    } catch (error: any) {
      console.error("Title generation error completely failed:", error.message);
      res.json({ title: firstMessage.trim().split(/\s+/).slice(0, 5).join(" ") || "New Chat" });
    }
  });





  app.post("/api/research/plan", async (req, res) => {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "query is required" });
    }

    try {
      const RESEARCH_MODEL = process.env.PRIMARY_RESEARCH_MODEL || "openai/gpt-oss-120b:free";
      const FALLBACK_MODEL = "google/gemma-3-27b-it:free";

      const systemPrompt = "You are an expert research planner.\n" +
        "Analyze the user's research query and generate a structured research plan.\n" +
        "Return ONLY a valid JSON object matching this schema:\n" +
        "{\n" +
        "  \"title\": \"A concise 3-6 word title for this research\",\n" +
        "  \"estimatedSources\": <number between 10 and 100>,\n" +
        "  \"steps\": [\n" +
        "    \"A clear, descriptive step (e.g. Survey recent academic literature...)\",\n" +
        "    \"Another step...\"\n" +
        "  ]\n" +
        "}\n" +
        "Generate 3-6 steps. No markdown formatting outside the JSON.";

      const planResult = await executeWithFallbacks(
        openai,
        {
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: "Query: " + query }
          ],
          temperature: 0.2,
          max_tokens: 500
        },
        [RESEARCH_MODEL, FALLBACK_MODEL],
        JSON.stringify({
          title: "Research: " + query.substring(0, 30),
          estimatedSources: 25,
          steps: [
            "Analyze the core concepts and definitions.",
            "Gather relevant data, articles, and documentation.",
            "Synthesize findings into a comprehensive report."
          ]
        }),
        'research_plan_generation'
      );

      let parsedPlan;
      try {
        let cleanJson = planResult.trim();
        if (cleanJson.startsWith('```json')) {
          cleanJson = cleanJson.replace(/^```json/, '').replace(/```$/, '').trim();
        }
        parsedPlan = JSON.parse(cleanJson);
      } catch (e) {
        // Fallback if parsing fails
        parsedPlan = {
          title: "Research Plan",
          estimatedSources: 30,
          steps: [
            "Analyze intent and constraints.",
            "Survey available literature and data.",
            "Compile and synthesize findings.",
            "Format the final report."
          ]
        };
      }

      res.json(parsedPlan);
    } catch (error) {
      console.error("Research plan generation failed:", error);
      res.status(500).json({ error: "Failed to generate plan" });
    }
  });

  app.post("/api/canvas/edit", async (req, res) => {

    const { selectedText, instruction, model } = req.body;
    if (!selectedText || !instruction) {
      return res.status(400).json({ error: "selectedText and instruction are required" });
    }

    try {
      const currentOpenAI = openai;

      const completion = await currentOpenAI.chat.completions.create({
        model: model || "meta-llama/Meta-Llama-3-8B-Instruct",
        temperature: 0.35,
        max_tokens: 1200,
        messages: [
          {
            role: "system",
            content: [
              "You are MemoryBase Canvas edit mode.",
              "Return only the replacement text for the selected range.",
              "Do not include prefaces, explanations, markdown fences, or quotes unless they belong in the replacement.",
              "Preserve the user's language and formatting intent.",
            ].join(" "),
          },
          {
            role: "user",
            content: `Instruction: ${instruction}\n\nSelected text:\n${selectedText}`,
          },
        ],
      });

      res.json({ replacement: completion.choices[0]?.message?.content?.trim() || "" });
    } catch (error: any) {
      console.error("Canvas edit error:", error);
      res.status(500).json({ error: error.message || "Failed to edit selection" });
    }
  });





}

async function startServer() {

  setupRoutes();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Only run the server if this file is executed directly (not imported), or if it's explicitly started
const isServerless = !!process.env.LAMBDA_TASK_ROOT || !!process.env.VERCEL || !!process.env.NETLIFY;
if (isServerless) {
  setupRoutes();
} else {
  startServer();
}
