import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import OpenAI, { toFile } from "openai";
import dotenv from "dotenv";
import { ReasoningController } from "./server/orchestrator/reasoningController.ts";
import { PersonalizationService } from "./server/personalization/personalizationService.ts";
import { getBearerToken, getUserFromToken } from "./server/supabase.ts";
import { YouTubeAgent } from "./src/services/browser/YouTubeAgent.ts";
import { LinkedInAgent } from "./src/services/browser/LinkedInAgent.ts";
import { BrowserIntent } from "./src/services/browser/BrowserActionTypes.ts";
import { SystemAudioAgent } from "./src/services/system/SystemAudioAgent.ts";
import { SystemIntent } from "./src/services/system/SystemActionTypes.ts";

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
    const accessToken = getBearerToken(req.headers.authorization);

    if (accessToken === "dummy_token") {
      return { accessToken, user: { id: "anonymous-user-123" } };
    }

    const user = await getUserFromToken(accessToken);

    if (!accessToken || !user) {
      res.status(401).json({ error: "Authentication required" });
      return null;
    }

    return { accessToken, user };
  }

  // API route for chat message streaming
  app.post("/api/chat", async (req, res) => {
    const auth = await authenticateRequest(req, res);
    if (!auth) return;

    const { messages, model, searchWeb, openRouterApiKey } = req.body;
    const userId = auth.user.id;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required" });
    }

    try {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const currentOpenAI = openRouterApiKey ? new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: openRouterApiKey,
      }) : openai;

      await ReasoningController.execute(currentOpenAI, userId, auth.accessToken, messages, model, searchWeb, res);
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

  app.post("/api/canvas/edit", async (req, res) => {
    const auth = await authenticateRequest(req, res);
    if (!auth) return;

    const { selectedText, instruction, model, openRouterApiKey } = req.body;
    if (!selectedText || !instruction) {
      return res.status(400).json({ error: "selectedText and instruction are required" });
    }

    try {
      const currentOpenAI = openRouterApiKey ? new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: openRouterApiKey,
      }) : openai;

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

  app.post("/api/transcribe", async (req, res) => {
    const auth = await authenticateRequest(req, res);
    if (!auth) return;

    const { audio } = req.body;
    if (!audio) {
      return res.status(400).json({ error: "Audio data is required" });
    }

    try {
      const groqKey = process.env.GROQ_API_KEY;
      if (!groqKey) {
        return res.status(500).json({ error: "Groq API key not configured on server" });
      }

      const groq = new OpenAI({
        apiKey: groqKey,
        baseURL: "https://api.groq.com/openai/v1"
      });

      const buffer = Buffer.from(audio, 'base64');
      const file = await toFile(buffer, 'audio.webm', { type: 'audio/webm' });

      const transcription = await groq.audio.transcriptions.create({
        file,
        model: 'whisper-large-v3-turbo',
      });

      res.json({ text: transcription.text });
    } catch (error: any) {
      console.error("Groq Transcription Error:", error);
      res.status(500).json({ error: error.message || "Failed to transcribe audio" });
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

  // Browser Automation Intent Router
  app.post("/api/browser/intent", async (req, res) => {
    const auth = await authenticateRequest(req, res);
    if (!auth) return;

    const intent: BrowserIntent = req.body.intent;
    if (!intent || !intent.action) {
      return res.status(400).json({ error: "Invalid intent" });
    }

    try {
      if (intent.action === "play_youtube") {
        const agent = new YouTubeAgent();
        const result = await agent.playVideo(intent.query);
        return res.json(result);
      }
      if (intent.action === "search_linkedin") {
        const agent = new LinkedInAgent();
        const result = await agent.search(intent.query);
        return res.json(result);
      }
      return res.status(400).json({ error: "Unknown intent action" });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // System OS Intent Router
  app.post("/api/system/intent", async (req, res) => {
    const auth = await authenticateRequest(req, res);
    if (!auth) return;

    const intent: SystemIntent = req.body.intent;
    if (!intent || !intent.action) {
      return res.status(400).json({ error: "Invalid intent" });
    }

    try {
      if (intent.action === "system_volume_decrease") {
        const agent = new SystemAudioAgent();
        const result = await agent.adjustVolume({ operation: "decrease", percentage: intent.percentage });
        return res.json(result);
      }
      if (intent.action === "system_volume_increase") {
        const agent = new SystemAudioAgent();
        const result = await agent.adjustVolume({ operation: "increase", percentage: intent.percentage });
        return res.json(result);
      }
      if (intent.action === "system_volume_get") {
        const agent = new SystemAudioAgent();
        const result = await agent.getVolume();
        return res.json(result);
      }
      if (intent.action === "system_volume_set") {
        const agent = new SystemAudioAgent();
        const result = await agent.setVolume(intent.volume);
        return res.json(result);
      }
      return res.status(400).json({ error: "Unknown intent action" });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
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
const isLambda = !!process.env.LAMBDA_TASK_ROOT || !!process.env.NETLIFY;
if (!isLambda) {
  startServer();
}
