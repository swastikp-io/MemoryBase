import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withRetriesAndFallback, validateChatCompletion } from '../utils/llmValidation.ts';

describe('LLM Reliability & Validation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Validation Engine', () => {
    it('Case 1: Provider returns valid choices', () => {
      const result = validateChatCompletion({
        choices: [{ message: { content: 'Success' } }]
      });
      expect(result.valid).toBe(true);
    });

    it('Case 2: Provider returns malformed empty object {}', () => {
      const result = validateChatCompletion({});
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/choices/);
    });

    it('Case 3: Provider returns explicit error object', () => {
      const result = validateChatCompletion({
        error: { message: 'Provider unavailable', code: 502 }
      });
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/Provider unavailable/);
    });
  });

  describe('withRetriesAndFallback Engine', () => {
    it('Case 4: Provider times out or throws error immediately', async () => {
      const mockOpenAI = {
        chat: {
          completions: {
            create: vi.fn().mockRejectedValue(new Error('timeout'))
          }
        }
      } as any;

      const startTime = Date.now();
      const result = await withRetriesAndFallback(
        mockOpenAI,
        { model: 'test' },
        'Fallback triggered',
        1,
        'test'
      );
      
      expect(result).toBe('Fallback triggered');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(2); // 1 initial + 1 retry
      expect(Date.now() - startTime).toBeGreaterThanOrEqual(1000); // Wait 1s backoff
    });

    it('Case 5: Planning fails due to malformed payload', async () => {
      const mockOpenAI = {
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({}) // Malformed response
          }
        }
      } as any;

      const result = await withRetriesAndFallback(
        mockOpenAI,
        { model: 'test' },
        'Default fallback plan',
        1,
        'planning'
      );

      expect(result).toBe('Default fallback plan');
    });
  });
});
