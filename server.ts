import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import OpenAI, { toFile } from "openai";
import dotenv from "dotenv";
import { ReasoningController } from "./server/orchestrator/reasoningController.ts";
import { PersonalizationService } from "./server/personalization/personalizationService.ts";

dotenv.config();

const appUrl = process.env.APP_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "dummy_key",
});

export const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

export function setupRoutes() {

  async function authenticateRequest(req: express.Request, res: express.Response) {
    return { accessToken: "dummy_token", user: { id: "anonymous-user-123" } };
  }

  // API route for chat message streaming
  app.post("/api/chat", async (req, res) => {
    const auth = await authenticateRequest(req, res);
    if (!auth) return;

    const { messages, model } = req.body;
    const userId = auth.user.id;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required" });
    }

    try {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const currentOpenAI = openai;

      await ReasoningController.execute(currentOpenAI, userId, auth.accessToken, messages, model, res);
      res.write("data: [DONE]\n\n");
      res.end();

    } catch (error: any) {
      console.error("OpenRouter API Error:", error);
      let errorMessage = "An error occurred while communicating with the AI.";
      if (error && error.message) {
        if (error.status === 429 || error.message.includes("429") || error.message.includes("Quota exceeded") || error.message.includes("rate limit")) {
          errorMessage = "Rate limit exceeded. Check back after 24 hours.";
        } else if (error.status === 401) {
          errorMessage = "Unauthorized. Please check your OpenRouter API Key in the Settings.";
        } else {
          errorMessage = "Error: " + error.message;
        }
      }
      res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
    }
  });

  app.post("/api/chat/title", async (req, res) => {
    const auth = await authenticateRequest(req, res);
    if (!auth) return;

    const { firstMessage, model } = req.body;
    if (!firstMessage) {
      return res.status(400).json({ error: "firstMessage is required" });
    }

    try {
      const currentOpenAI = openai;
      let actualModel = "openai/gpt-oss-120b:free";
      if (model === "research" || model === "google/gemma-4-31b-it:free") {
        actualModel = "google/gemma-4-31b-it:free";
      } else if (model === "coding" || model === "moonshotai/kimi-k2.6:free") {
        actualModel = "moonshotai/kimi-k2.6:free";
      }

      const completion = await currentOpenAI.chat.completions.create({
        model: actualModel,
        temperature: 0.3,
        max_tokens: 30,
        messages: [
          {
            role: "system",
            content: "You generate concise conversation titles.\nRules:\n- Maximum 6 words\n- No quotation marks\n- No punctuation unless necessary\n- Title Case\n- Descriptive\n- Professional\n- No filler words\nReturn only the title."
          },
          {
            role: "user",
            content: `Input:\n${firstMessage}`
          }
        ]
      });

      let generatedTitle = completion.choices[0]?.message?.content?.trim() || "";
      generatedTitle = generatedTitle.replace(/["':\n]/g, ""); // Remove quotes and newlines
      if (generatedTitle.length > 60) {
        generatedTitle = generatedTitle.substring(0, 60).trim();
      }

      res.json({ title: generatedTitle });
    } catch (error: any) {
      console.error("Title generation error gracefully caught:", error.message);
      
      // Backend fallback logic to ensure frontend never receives a 500
      let fallbackTitle = firstMessage.trim().split(/\s+/).slice(0, 5).join(" ");
      if (!fallbackTitle) fallbackTitle = "New Chat";
      
      res.json({ title: fallbackTitle });
    }
  });

  app.post("/api/canvas/edit", async (req, res) => {
    const auth = await authenticateRequest(req, res);
    if (!auth) return;

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
              "You are Paralex Canvas edit mode.",
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


  // Settings API Routes for Personalization
  app.get("/api/settings/personalization/:userId", (req, res) => {
    const settings = PersonalizationService.getSettings(req.params.userId);
    res.json(settings || {});
  });

  app.post("/api/settings/personalization/:userId", (req, res) => {
    const updated = PersonalizationService.updateSettings(req.params.userId, req.body);
    res.json(updated);
  });

  // Settings API Routes (Mocked for architecture completeness)
  let mockBackendSettings = {
    memoryEnabled: true,
    conversationContinuityEnabled: true,
    autoMemoryDetectionEnabled: true
  };

  app.get("/api/settings/memory", (req, res) => {
    res.json(mockBackendSettings);
  });

  app.patch("/api/settings/memory-toggle", (req, res) => {
    mockBackendSettings.memoryEnabled = !!req.body.enabled;
    res.json(mockBackendSettings);
  });

  app.patch("/api/settings/conversation-continuity", (req, res) => {
    mockBackendSettings.conversationContinuityEnabled = !!req.body.enabled;
    res.json(mockBackendSettings);
  });

  app.patch("/api/settings/auto-memory-detection", (req, res) => {
    mockBackendSettings.autoMemoryDetectionEnabled = !!req.body.enabled;
    res.json(mockBackendSettings);
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
const isLambda = !!process.env.LAMBDA_TASK_ROOT || !!process.env.NETLIFY;
if (!isLambda) {
  startServer();
}
