export interface StartupTask {
  id: string;
  name: string;
  action: () => Promise<void>;
  statusMessages: string[];
}

class WorkspaceRoutineManager {
  private isRunning: boolean = false;
  private abortController: AbortController | null = null;
  private onMessageTTS: (message: string) => Promise<void>;

  constructor() {
    this.onMessageTTS = async () => {};
  }

  public setTTSHandler(handler: (message: string) => Promise<void>) {
    this.onMessageTTS = handler;
  }

  private getRandomMessage(messages: string[]): string {
    return messages[Math.floor(Math.random() * messages.length)];
  }

  private async sleep(ms: number, signal?: AbortSignal) {
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        if (signal?.aborted) {
          reject(new Error('Aborted'));
        } else {
          resolve();
        }
      }, ms);
      
      if (signal) {
        signal.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new Error('Aborted'));
        });
      }
    });
  }

  public async startRoutine() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    const tasks: StartupTask[] = [
      {
        id: 'open_settings',
        name: 'Open Settings',
        action: async () => {
          window.dispatchEvent(new CustomEvent('open-settings'));
          window.dispatchEvent(new CustomEvent('switch-settings-tab', { detail: 'general' }));
        },
        statusMessages: ['Checking workspace preferences.']
      },
      {
        id: 'profile_check',
        name: 'Profile Check',
        action: async () => {
          window.dispatchEvent(new CustomEvent('switch-settings-tab', { detail: 'profile' }));
        },
        statusMessages: ['Reviewing user identity modules.', 'Verifying profile configurations.']
      },
      {
        id: 'personalization_check',
        name: 'Personalization Check',
        action: async () => {
          window.dispatchEvent(new CustomEvent('switch-settings-tab', { detail: 'personalization' }));
        },
        statusMessages: ['Reviewing personalization settings.', 'Applying custom workspace parameters.']
      },
      {
        id: 'ai_check',
        name: 'AI Models Check',
        action: async () => {
          window.dispatchEvent(new CustomEvent('switch-settings-tab', { detail: 'aiBehavior' }));
        },
        statusMessages: ['Verifying AI model configuration.', 'Checking neural routing endpoints.']
      },
      {
        id: 'privacy_check',
        name: 'Privacy Check',
        action: async () => {
          window.dispatchEvent(new CustomEvent('switch-settings-tab', { detail: 'privacy' }));
        },
        statusMessages: ['Confirming security protocols.', 'Validating data privacy boundaries.']
      }
    ];

    try {
      await this.onMessageTTS("Certainly. Preparing your workspace and running a quick systems check.");
      await this.sleep(1000, signal);

      for (const task of tasks) {
        if (signal.aborted) throw new Error('Aborted');
        
        await task.action();
        
        // Speak random status message
        if (task.statusMessages.length > 0) {
          const msg = this.getRandomMessage(task.statusMessages);
          await this.onMessageTTS(msg);
        }
        
        await this.sleep(1000, signal);
      }

      if (signal.aborted) throw new Error('Aborted');

      window.dispatchEvent(new CustomEvent('close-settings'));
      await this.onMessageTTS("Workspace ready. All core systems appear operational. What would you like to work on next?");

    } catch (err: any) {
      if (err.message === 'Aborted') {
        window.dispatchEvent(new CustomEvent('close-settings'));
        await this.onMessageTTS("Workspace initialization cancelled.");
      }
    } finally {
      this.isRunning = false;
      this.abortController = null;
    }
  }

  public stopRoutine() {
    if (this.isRunning && this.abortController) {
      this.abortController.abort();
    }
  }
}

export const workspaceRoutine = new WorkspaceRoutineManager();
