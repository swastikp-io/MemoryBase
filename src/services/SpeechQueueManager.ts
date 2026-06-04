import { supabase } from '../lib/supabase';

export class SpeechQueueManager {
  private queue: string[] = [];
  private speaking: boolean = false;
  private currentAudio: HTMLAudioElement | null = null;
  private currentObjectUrl: string | null = null;
  
  // Debug mode for production diagnostics
  private readonly DEBUG_MODE = true;

  private log(message: string, data?: any) {
    if (this.DEBUG_MODE) {
      if (data) {
        console.log(`[TTS Debug] ${message}`, data);
      } else {
        console.log(`[TTS Debug] ${message}`);
      }
    }
  }

  private error(message: string, error?: any) {
    console.error(`[TTS Error] ${message}`, error);
    // Dispatch custom event for UI error
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('tts-error', { detail: { message, error: error?.message || String(error) } });
      window.dispatchEvent(event);
    }
  }

  constructor() {
    // Check TTS Health on startup
    this.checkHealth();
  }

  private async checkHealth() {
    try {
      this.log("Checking /api/tts-health");
      const res = await fetch("/api/tts-health");
      const data = await res.json();
      this.log("Health check response", data);
    } catch (e) {
      this.error("Health check failed", e);
    }
  }

  public isSpeaking(): boolean {
    return this.speaking;
  }

  public enqueue(text: string): void {
    const cleanText = text.replace(/[*_#]/g, '').trim();
    if (!cleanText) return;
    this.queue.push(cleanText);
    this.processQueue();
  }

  public async speakAndWait(text: string): Promise<void> {
    const cleanText = text.replace(/[*_#]/g, '').trim();
    if (!cleanText) return Promise.resolve();

    return new Promise<void>((resolve) => {
      this.enqueueTask(cleanText, resolve);
    });
  }

  private taskQueue: { text: string; resolve?: () => void }[] = [];

  private enqueueTask(text: string, resolve?: () => void) {
    this.taskQueue.push({ text, resolve });
    setTimeout(() => {
      this.processQueue();
    }, 50);
  }

  public enqueueText(text: string) {
    const cleanText = text.replace(/[*_#]/g, '').trim();
    if (!cleanText) return;
    this.enqueueTask(cleanText);
  }

  private async processQueue() {
    if (this.speaking || this.taskQueue.length === 0) return;

    this.speaking = true;
    const task = this.taskQueue.shift()!;

    try {
      this.log("Request start", { textLength: task.text.length, textSnippet: task.text.substring(0, 50) });
      
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token || "dummy_token";

      const ttsStartTime = Date.now();
      const payload = { input: task.text, voice: "alloy", model: "tts-1", response_format: "mp3" };
      
      this.log("Request payload", payload);
      
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(payload)
      });

      this.log(`Groq response status`, { status: response.status, ok: response.ok });

      if (!response.ok) {
        let errorMsg = await response.text();
        throw new Error(`Server returned ${response.status}: ${errorMsg}`);
      }

      const audioBlob = await response.blob();
      const generationTime = Date.now() - ttsStartTime;
      
      this.log("Response size", { bytes: audioBlob.size, type: audioBlob.type });
      this.log("Audio generation time", { ms: generationTime });

      if (audioBlob.size === 0) {
        throw new Error("Received empty audio blob from server");
      }

      this.currentObjectUrl = URL.createObjectURL(audioBlob);
      this.currentAudio = new Audio(this.currentObjectUrl);

      this.currentAudio.onplay = () => {
        this.log("Playback start");
      };

      this.currentAudio.onended = () => {
        this.log("Playback ended smoothly", { duration: this.currentAudio?.duration });
        this.cleanupCurrentAudio();
        this.onSpeechFinished();
        if (task.resolve) task.resolve();
      };

      this.currentAudio.onerror = (e) => {
        this.error("Playback failures", e);
        this.cleanupCurrentAudio();
        this.onSpeechFinished();
        if (task.resolve) task.resolve();
      };

      try {
        await this.currentAudio.play();
      } catch (playError) {
        this.error("Autoplay restriction or playback error", playError);
        // Continue queue even if play fails
        this.cleanupCurrentAudio();
        this.onSpeechFinished();
        if (task.resolve) task.resolve();
      }
    } catch (err) {
      this.error("TTS generation failed", err);
      this.onSpeechFinished();
      if (task.resolve) task.resolve();
    }
  }

  private cleanupCurrentAudio() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.src = "";
      this.currentAudio = null;
    }
    if (this.currentObjectUrl) {
      URL.revokeObjectURL(this.currentObjectUrl);
      this.currentObjectUrl = null;
    }
  }

  public onSpeechFinished() {
    this.speaking = false;
    setTimeout(() => {
      this.processQueue();
    }, 10);
  }

  public clearQueue() {
    this.taskQueue = [];
    if (this.speaking) {
      this.cleanupCurrentAudio();
      this.speaking = false;
    }
  }
}

export const speechQueue = new SpeechQueueManager();

