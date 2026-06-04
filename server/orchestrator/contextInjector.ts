import { PersonalizationService } from '../personalization/personalizationService.ts';
export async function injectContext(
  userId: string,
  accessToken: string,
  messages: any[],
  searchWeb: boolean
): Promise<any[]> {
  const memories: any[] = [];

  // Generate the dynamic system prompt with injected personalization
  let systemInstruction = PersonalizationService.generatePersonalizedPrompt(userId, messages, memories);

  if (searchWeb) {
    systemInstruction += "\n\nWhen web search is enabled, search the web for references and answers, and cite relevant sources when possible.";
  }

  // Find if user sent a pre-baked system instruction (we will override or merge it)
  // Currently, the promptCompiler uses SUPER_PROMPT directly, so we just replace the system msg entirely.

  return [
    { role: "system", content: systemInstruction },
    ...messages.filter((m: any) => m.role !== "system").map((msg: any) => {
      const contentItems: any[] = [];
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
