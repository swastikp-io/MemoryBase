import { compileSystemPrompt } from './promptCompiler.ts';

export class PersonalizationService {
  static generatePersonalizedPrompt(userId: string, messages: any[], memories: any[] = []): string {
    return compileSystemPrompt({
      aboutUser: '',
      responseStyle: '',
      memories: memories.map(m => m.text)
    });
  }
}
