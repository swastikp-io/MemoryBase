import { describe, it, expect } from 'vitest';
import { resolveModel } from '../lib/models/resolver.ts';
import { MODEL_REGISTRY } from '../lib/models/registry.ts';

describe('Chat Mode Resolver', () => {
  it('should resolve standard mode to nemotron', () => {
    expect(resolveModel('standard')).toBe('nvidia/nemotron-3-ultra-550b-a55b:free');
    expect(MODEL_REGISTRY.standard.id).toBe('nvidia/nemotron-3-ultra-550b-a55b:free');
  });

  it('should resolve coding mode to kimi', () => {
    expect(resolveModel('coding')).toBe('moonshotai/kimi-k2.6:free');
    expect(MODEL_REGISTRY.coding.id).toBe('moonshotai/kimi-k2.6:free');
  });

  it('should fallback to standard mode for unknown modes', () => {
    expect(resolveModel('unknown' as any)).toBe('nvidia/nemotron-3-ultra-550b-a55b:free');
  });
});
