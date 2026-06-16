import OpenAI from 'openai';

import { ProviderLogger } from './providerLogger.ts';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a standard chat completion response from an LLM provider.
 * Ensures the response structure is intact and contains valid choices.
 */
export function validateChatCompletion(response: any): ValidationResult {
  if (!response) {
    return { valid: false, error: "Response is undefined or null" };
  }

  if (response.error) {
    const errorMsg = response.error.message || JSON.stringify(response.error);
    return { valid: false, error: `Provider returned an error: ${errorMsg}` };
  }

  if (!response.choices) {
    return { valid: false, error: "Response is missing 'choices' array" };
  }

  if (!Array.isArray(response.choices)) {
    return { valid: false, error: "'choices' is not an array" };
  }

  if (response.choices.length === 0) {
    return { valid: false, error: "'choices' array is empty" };
  }

  const firstChoice = response.choices[0];
  if (!firstChoice.message) {
    return { valid: false, error: "First choice is missing 'message' object" };
  }

  return { valid: true };
}

/**
 * Executes an OpenAI API call with retries and a fallback mechanism.
 * @param openai OpenAI instance
 * @param params Chat completion parameters
 * @param fallbackResponse The string to return if all retries fail
 * @param maxRetries Number of retries before falling back
 * @param requestType Type of the request for provider logs (default: 'chat')
 */
export async function withRetriesAndFallback(
  openai: OpenAI,
  params: any,
  fallbackResponse: string,
  maxRetries: number = 2,
  requestType: string = 'chat'
): Promise<string> {
  let attempt = 0;
  
  while (attempt <= maxRetries) {
    const startTime = performance.now();
    try {
      const response = await openai.chat.completions.create(params);
      const latencyMs = performance.now() - startTime;
      
      const validation = validateChatCompletion(response);
      if (!validation.valid) {
        console.warn(`[LLM Validation Failed] Attempt ${attempt + 1}: ${validation.error}`);
        ProviderLogger.log({
          provider: 'openrouter',
          model: params.model,
          request_type: requestType,
          success: false,
          error_message: validation.error,
          latency_ms: latencyMs
        });
        throw new Error(validation.error);
      }
      
      ProviderLogger.log({
        provider: 'openrouter',
        model: params.model,
        request_type: requestType,
        success: true,
        latency_ms: latencyMs
      });

      const content = (response as any).choices[0]?.message?.content;
      if (content) {
        return content.trim();
      }
    } catch (error: any) {
      const latencyMs = performance.now() - startTime;
      console.error(`[LLM Call Error] Attempt ${attempt + 1} failed:`, error);
      
      ProviderLogger.log({
        provider: 'openrouter',
        model: params.model,
        request_type: requestType,
        success: false,
        error_message: error.message || 'Unknown error',
        latency_ms: latencyMs
      });

      if (attempt < maxRetries) {
        const backoffMs = (attempt + 1) * 1000; // 1s, 2s...
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
    attempt++;
  }
  
  console.warn(`[LLM Fallback Triggered] All ${maxRetries + 1} attempts failed. Returning fallback response.`);
  return fallbackResponse;
}
