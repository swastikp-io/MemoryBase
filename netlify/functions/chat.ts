import { MemoryExtractor } from "../../server/memoryExtractor.ts";
import { ReasoningController } from "../../server/orchestrator/reasoningController.ts";
import OpenAI from "openai";

export default async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const accessToken = "dummy_token";
  const user = { id: "anonymous-user-123", email: "guest" };

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const { messages, model, searchWeb, memorySettings } = body;
  const userId = user.id;
  const memoryEnabled = memorySettings?.memoryEnabled !== false;
  const conversationContinuity = memorySettings?.conversationContinuity !== false;
  const autoMemoryDetection = memorySettings?.autoMemoryDetection !== false;
  const shouldRetrieveMemories = memoryEnabled && conversationContinuity;
  const shouldSaveMemories = memoryEnabled && autoMemoryDetection;

  if (!messages || !Array.isArray(messages)) {
    return new Response(JSON.stringify({ error: "Messages array is required" }), { status: 400 });
  }

  const appUrl = process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const currentOpenAI = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY || "dummy_key",
    defaultHeaders: {
      "HTTP-Referer": appUrl,
      "X-Title": "Paralex",
    }
  });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Mock Express response object for ReasoningController
      const mockRes = {
        write: (chunk: string) => {
          controller.enqueue(encoder.encode(chunk));
        },
        end: () => {
          controller.close();
        },
        setHeader: () => { }
      };

      try {
        const memoryPromise = shouldSaveMemories
          ? MemoryExtractor.extract(currentOpenAI, userId, accessToken, messages, model)
          : Promise.resolve(false);

        await ReasoningController.execute(currentOpenAI, userId, accessToken, messages, model, searchWeb, mockRes, user.email);

        try {
          const memoryUpdated = await memoryPromise;
          if (memoryUpdated) {
            mockRes.write(`data: ${JSON.stringify({ memoryUpdated: true })}\n\n`);
          }
        } catch (error: any) {
          console.error('[Chat] Memory extraction failed:', error);
          mockRes.write(`data: ${JSON.stringify({ memoryError: error.message || 'Failed to save memory' })}\n\n`);
        }
        mockRes.write("data: [DONE]\n\n");
        mockRes.end();
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
        mockRes.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
        mockRes.write("data: [DONE]\n\n");
        mockRes.end();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*"
    }
  });
};
