export interface UserPersonalization {
  id: string;
  userId: string;
  aboutUser: string;
  responseStyle: string;
  behaviorProfile: any;
  updatedAt: string;
}

class PersonalizationStore {
  private data: Map<string, UserPersonalization> = new Map();

  getSettings(userId: string): UserPersonalization | null {
    return this.data.get(userId) || null;
  }

  saveSettings(userId: string, settings: Partial<UserPersonalization>) {
    const existing = this.getSettings(userId) || {
      id: userId,
      userId,
      aboutUser: '',
      responseStyle: '',
      behaviorProfile: {},
      updatedAt: new Date().toISOString()
    };
    
    const updated = { ...existing, ...settings, updatedAt: new Date().toISOString() };
    this.data.set(userId, updated);
    return updated;
  }
}

export const personalizationDb = new PersonalizationStore();
