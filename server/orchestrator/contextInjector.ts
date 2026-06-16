import { PersonalizationService } from '../personalization/personalizationService.ts';

interface MessageInput {
  role: string;
  content: string;
  images?: string[];
}

interface ContentPart {
  type: string;
  text?: string;
  image_url?: { url: string };
}

interface FormattedMessage {
  role: string;
  content: string | ContentPart[];
}

export async function injectContext(
  userId: string,
  accessToken: string,
  messages: MessageInput[]
): Promise<FormattedMessage[]> {
  // Generate the dynamic system prompt with injected personalization
  const systemInstruction = PersonalizationService.generatePersonalizedPrompt(userId, messages, []);

  // Find if user sent a pre-baked system instruction (we will override or merge it)
  // Currently, the promptCompiler uses SUPER_PROMPT directly, so we just replace the system msg entirely.

  return [
    { role: "system", content: systemInstruction },
    ...messages.filter((m) => m.role !== "system").map((msg) => {
      const contentItems: ContentPart[] = [];
      if (msg.content) contentItems.push({ type: "text", text: msg.content });
      if (msg.images && msg.images.length > 0) {
        msg.images.forEach((imgBase64: string) => {
          contentItems.push({
            type: "image_url",
            image_url: { url: imgBase64 }
          });
        });
      }
      return {
        role: msg.role === "user" ? "user" : "assistant",
        content: contentItems.length > 0 ? contentItems : [{ type: "text", text: "" }],
      };
    })
  ];
}
