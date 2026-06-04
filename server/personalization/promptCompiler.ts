import { SUPER_PROMPT } from '../../src/lib/prompt.ts';

export interface CompilationContext {
  aboutUser: string;
  responseStyle: string;
  inferredDetails?: string;
  preferredFormat?: string;
  memories?: string[];
}

export function compileSystemPrompt(context: CompilationContext): string {
  let prompt = `${SUPER_PROMPT}

# User Personalization Settings
Apply the following user personalization settings:`;

  if (context.aboutUser) {
    prompt += `\n- About the User: ${context.aboutUser}`;
  }
  if (context.responseStyle) {
    prompt += `\n- Response Style: ${context.responseStyle}`;
  }
  
  if (context.inferredDetails) {
    prompt += `\n- Inferred Behavioral Patterns: ${context.inferredDetails}`;
  }

  if (context.memories && context.memories.length > 0) {
    prompt += `\n\n# User Memories (Retrieved Facts & Preferences)\nThe following context summarizes past facts the user has shared. Use these to tailor your response accurately:\n`;
    context.memories.forEach(m => {
      prompt += `- ${m}\n`;
    });
  }
  
  return prompt;
}
