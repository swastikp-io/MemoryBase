import { describe, it, expect } from 'vitest';
import { getSystemPrompt } from '../../server/orchestrator/prompts/router';

describe('Standard Mode Pipeline Regression', () => {
  it('Should use the standard ChatGPT-like prompt without reasoning scaffolding', () => {
    const prompt = getSystemPrompt('standard');
    
    // It should NOT contain positive reasoning structural instructions
    expect(prompt).not.toContain('Restate objective.');
    expect(prompt).not.toContain('Compare tradeoffs.');
    expect(prompt).not.toContain('Step-by-step execution.');

    // It SHOULD instruct direct natural responses
    expect(prompt).toContain('direct AI assistant');
    expect(prompt).toContain("answer the user's question clearly");
  });

  it('Should separate reasoning and research modes correctly', () => {
    const reasoningPrompt = getSystemPrompt('reasoning');
    const researchPrompt = getSystemPrompt('research');

    expect(reasoningPrompt).toContain('Problem');
    expect(reasoningPrompt).toContain('Options Considered');
    
    expect(researchPrompt).toContain('Executive Summary');
    expect(researchPrompt).toContain('Key Findings');
  });
});
