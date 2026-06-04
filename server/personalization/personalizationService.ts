import { personalizationDb } from '../db/personalizationStore.ts';
import { compileSystemPrompt } from './promptCompiler.ts';
import { BehaviorTracker } from './behaviorTracker.ts';

export class PersonalizationService {
  static getSettings(userId: string) {
    return personalizationDb.getSettings(userId);
  }

  static updateSettings(userId: string, data: any) {
    return personalizationDb.saveSettings(userId, data);
  }

  static generatePersonalizedPrompt(userId: string, messages: any[], memories: any[] = []): string {
    const settings = personalizationDb.getSettings(userId);
    if (!settings) {
      return compileSystemPrompt({
        aboutUser: '',
        responseStyle: '',
        memories: memories.map(m => m.text)
      });
    }

    // Step 5 & 6: Track behavior & adapt
    const newProfile = BehaviorTracker.trackInteraction(userId, messages, settings.behaviorProfile);
    
    // We optionally save it back asynchronously
    setTimeout(() => {
      personalizationDb.saveSettings(userId, { behaviorProfile: newProfile });
    }, 0);

    // Step 3 & 4: Compile prompt with inferred details
    return compileSystemPrompt({
      aboutUser: settings.aboutUser,
      responseStyle: settings.responseStyle,
      inferredDetails: newProfile.communicationPreference ? `The user typically provides ${newProfile.communicationPreference}.` : '',
      memories: memories.map(m => m.text)
    });
  }
}
