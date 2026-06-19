import OpenAI from 'openai';

const ProviderLogger = { 
  log: (x: any) => {
    // structured logging
    let prefix = "[Provider]";
    if (x.provider === 'openrouter') prefix = "[OpenRouter]";
    
    if (x.event === 'RateLimited') {
      console.warn(`${prefix} Rate Limited on model ${x.model}.`);
    } else if (x.event === 'FallbackActivated') {
      console.warn(`${prefix} Fallback Activated to model ${x.model}.`);
    } else if (x.success === false) {
      console.error(`${prefix} Error: ${x.error_message}`);
    } else {
      console.log(`${prefix} Success: ${x.model} (${x.latency_ms}ms)`);
    }
  } 
};

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateChatCompletion(response: any): ValidationResult {
  if (!response) return { valid: false, error: "Response is undefined or null" };
  if (response.error) {
    const errorMsg = response.error.message || JSON.stringify(response.error);
    return { valid: false, error: `Provider returned an error: ${errorMsg}` };
  }
  if (!response.choices || !Array.isArray(response.choices) || response.choices.length === 0) {
    return { valid: false, error: "Response is missing valid 'choices' array" };
  }
  if (!response.choices[0].message) {
    return { valid: false, error: "First choice is missing 'message' object" };
  }
  return { valid: true };
}

export function isRateLimitError(error: any): boolean {
  if (!error) return false;
  const msg = (error.message || "").toLowerCase();
  const code = error.status || error.code || error.statusCode;
  if (code === 429) return true;
  if (msg.includes("429") || msg.includes("rate limit") || msg.includes("free-models-per-day")) return true;
  if (error.error && error.error.message) {
    const innerMsg = error.error.message.toLowerCase();
    if (innerMsg.includes("429") || innerMsg.includes("rate limit") || innerMsg.includes("free-models-per-day")) return true;
  }
  return false;
}

export async function executeWithFallbacks(
  openai: OpenAI,
  params: any, // expecting model to be an array or we will override it
  models: string[],
  fallbackResponse: string,
  requestType: string = 'chat'
): Promise<string> {
  const maxRetries = parseInt(process.env.OPENROUTER_MAX_RETRIES || "3");
  const baseDelayMs = parseInt(process.env.OPENROUTER_RETRY_DELAY_MS || "2000");

  let attempt = 0;
  let modelIndex = 0;

  while (modelIndex < models.length) {
    const currentModel = models[modelIndex];
    const currentParams = { ...params, model: currentModel };
    
    while (attempt <= maxRetries) {
      const startTime = performance.now();
      try {
        const response = await openai.chat.completions.create(currentParams);
        const latencyMs = performance.now() - startTime;
        
        const validation = validateChatCompletion(response);
        if (!validation.valid) throw new Error(validation.error);
        
        ProviderLogger.log({ provider: 'openrouter', model: currentModel, request_type: requestType, success: true, latency_ms: latencyMs });
        
        const content = (response as any).choices[0]?.message?.content;
        return content ? content.trim() : fallbackResponse;

      } catch (error: any) {
        const latencyMs = performance.now() - startTime;
        
        if (isRateLimitError(error)) {
          ProviderLogger.log({ provider: 'openrouter', model: currentModel, event: 'RateLimited', error_message: error.message, latency_ms: latencyMs });
          // Break inner loop to switch to next model immediately
          break;
        }

        console.error(`[LLM Call Error] Model ${currentModel} Attempt ${attempt + 1} failed:`, error.message);
        ProviderLogger.log({ provider: 'openrouter', model: currentModel, request_type: requestType, success: false, error_message: error.message || 'Unknown error', latency_ms: latencyMs });

        if (attempt < maxRetries) {
          const backoffMs = baseDelayMs * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
        attempt++;
      }
    }

    // Switch to next model
    modelIndex++;
    if (modelIndex < models.length) {
      ProviderLogger.log({ provider: 'openrouter', event: 'FallbackActivated', model: models[modelIndex] });
      attempt = 0; // reset attempts for new model
    }
  }
  
  console.warn(`[LLM Fallback Triggered] All models and retries failed. Returning local fallback response.`);
  return fallbackResponse;
}

export async function streamWithFallbacks(
  openai: OpenAI,
  params: any,
  models: string[],
  requestType: string = 'chat',
  onStreamStarted?: (modelUsed: string) => void
): Promise<AsyncIterable<any>> {
  const maxRetries = parseInt(process.env.OPENROUTER_MAX_RETRIES || "3");
  const baseDelayMs = parseInt(process.env.OPENROUTER_RETRY_DELAY_MS || "2000");

  let attempt = 0;
  let modelIndex = 0;

  while (modelIndex < models.length) {
    const currentModel = models[modelIndex];
    const currentParams = { ...params, model: currentModel, stream: true };
    
    while (attempt <= maxRetries) {
      const startTime = performance.now();
      try {
        const stream = await openai.chat.completions.create(currentParams) as any as AsyncIterable<any>;
        ProviderLogger.log({ provider: 'openrouter', model: currentModel, request_type: requestType, success: true, latency_ms: performance.now() - startTime });
        
        if (onStreamStarted) onStreamStarted(currentModel);
        return stream;

      } catch (error: any) {
        const latencyMs = performance.now() - startTime;
        
        if (isRateLimitError(error)) {
          ProviderLogger.log({ provider: 'openrouter', model: currentModel, event: 'RateLimited', error_message: error.message, latency_ms: latencyMs });
          break;
        }

        console.error(`[LLM Stream Error] Model ${currentModel} Attempt ${attempt + 1} failed:`, error.message);
        if (attempt < maxRetries) {
          const backoffMs = baseDelayMs * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
        attempt++;
      }
    }
    
    modelIndex++;
    if (modelIndex < models.length) {
      ProviderLogger.log({ provider: 'openrouter', event: 'FallbackActivated', model: models[modelIndex] });
      attempt = 0;
    }
  }

  throw new Error("All fallback models failed for streaming request.");
}

// Keep backward compatibility wrapper for existing tests/ReasoningController logic
export async function withRetriesAndFallback(
  openai: OpenAI,
  params: any,
  fallbackResponse: string,
  maxRetries: number = 2,
  requestType: string = 'chat'
): Promise<string> {
  return executeWithFallbacks(openai, params, [params.model], fallbackResponse, requestType);
}
