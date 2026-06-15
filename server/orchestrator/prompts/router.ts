import { standardSystemPrompt } from './standard.ts';
import { reasoningSystemPrompt, reasoningPlanPrompt } from './reasoning.ts';
import { researchSystemPrompt, researchPlanPrompt } from './research.ts';
import { codingSystemPrompt, codingPlanPrompt } from './coding.ts';

export const critiquePrompt = `Review the following draft response. Check for:
- Missing information
- Weak arguments
- Contradictions
- Unsupported claims
- Incomplete sections

Output a concise critique identifying areas for improvement. Do not rewrite the response.`;

export const improvePrompt = `Using the original query, the draft response, and the critique below, generate the FINAL improved response. 
Make sure you use the required structured format (as per your system instructions) for the final response.`;

export function getSystemPrompt(mode: string): string {
  switch (mode) {
    case 'research': return researchSystemPrompt;
    case 'reasoning': return reasoningSystemPrompt;
    case 'coding': return codingSystemPrompt;
    case 'standard': return standardSystemPrompt;
    default: return standardSystemPrompt;
  }
}

export function getPlanPrompt(mode: string): string {
  switch (mode) {
    case 'research': return researchPlanPrompt;
    case 'reasoning': return reasoningPlanPrompt;
    case 'coding': return codingPlanPrompt;
    default: return '';
  }
}
