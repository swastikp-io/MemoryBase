import { supabase } from '../../lib/supabase';

export interface PushToTalkState {
  isListening: boolean;
  isShortcutHeld: boolean;
  isAudioSuppressed: boolean;
  previousVolume: number | null;
}

class AudioSuppressionService {
  private state: PushToTalkState = {
    isListening: false,
    isShortcutHeld: false,
    isAudioSuppressed: false,
    previousVolume: null,
  };

  private async getAuthToken(): Promise<string> {
    const { data: sessionData } = await supabase.auth.getSession();
    return sessionData.session?.access_token || "dummy_token";
  }

  private isSavingState: boolean = false;
  private suppressionPromise: Promise<void> | null = null;

  async saveAudioState(): Promise<void> {
    if (this.isSavingState || this.state.previousVolume !== null) return;
    this.isSavingState = true;
    try {
      const token = await this.getAuthToken();
      const res = await fetch('/api/system/intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          intent: { action: "system_volume_get" }
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.volume !== undefined) {
          this.state.previousVolume = data.volume;
        }
      }
    } catch (e) {
      console.error("Failed to save audio state:", e);
    } finally {
      this.isSavingState = false;
    }
  }

  async suppressAudio(): Promise<void> {
    if (this.state.isAudioSuppressed) return;
    
    // Mark as suppressed immediately to block concurrent suppress calls
    this.state.isAudioSuppressed = true;

    this.suppressionPromise = (async () => {
      if (this.state.previousVolume === null) {
        await this.saveAudioState();
      }

      // Check if it was un-suppressed while saving state
      if (!this.state.isAudioSuppressed) return;

      try {
        const token = await this.getAuthToken();
        await fetch('/api/system/intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            intent: { action: "system_volume_set", volume: 0 }
          })
        });
      } catch (e) {
        console.error("Failed to suppress audio:", e);
        this.state.isAudioSuppressed = false;
      }
    })();

    await this.suppressionPromise;
  }

  async restoreAudio(): Promise<void> {
    this.state.isAudioSuppressed = false;

    if (this.suppressionPromise) {
      await this.suppressionPromise;
    }

    if (this.state.previousVolume === null) {
      this.cleanup();
      return;
    }

    try {
      const token = await this.getAuthToken();
      await fetch('/api/system/intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          intent: { action: "system_volume_set", volume: this.state.previousVolume }
        })
      });
    } catch (e) {
      console.error("Failed to restore audio:", e);
    } finally {
      this.cleanup();
    }
  }

  cleanup(): void {
    this.state.isAudioSuppressed = false;
    this.state.previousVolume = null;
    this.state.isShortcutHeld = false;
  }

  getState(): PushToTalkState {
    return { ...this.state };
  }

  setShortcutHeld(held: boolean) {
    this.state.isShortcutHeld = held;
  }
}

export const audioSuppressionService = new AudioSuppressionService();
