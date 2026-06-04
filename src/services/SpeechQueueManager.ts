export class SpeechQueueManager {
  private queue: string[] = [];
  private speaking: boolean = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private resolveCurrent: (() => void) | null = null;
  
  // Store utterances globally to prevent Chrome garbage collection bug
  private activeUtterances: Set<SpeechSynthesisUtterance> = new Set();

  constructor() {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      // Watchdog timer to recover from stuck speech synthesis state
      setInterval(() => {
        if (this.speaking && !window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
          console.warn("Speech synthesis appears stuck. Recovering...");
          this.speaking = false;
          this.currentUtterance = null;
          window.speechSynthesis.cancel();
          this.processQueue();
        }
      }, 2000);
    }
  }

  public isSpeaking(): boolean {
    return this.speaking || window.speechSynthesis.speaking;
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
      // Instead of just pushing the text, we push an object or wrap it in a way
      // But since we want speakAndWait to resolve, we can intercept the resolution.
      // A simpler way: we create a specific task for the queue.
      this.enqueueTask(cleanText, resolve);
    });
  }

  private taskQueue: { text: string; resolve?: () => void }[] = [];

  private enqueueTask(text: string, resolve?: () => void) {
    this.taskQueue.push({ text, resolve });
    // Delay processQueue slightly to avoid browser bugs when speak() is called immediately after cancel()
    setTimeout(() => {
      this.processQueue();
    }, 50);
  }

  // Override enqueue to use taskQueue
  public enqueueText(text: string) {
    const cleanText = text.replace(/[*_#]/g, '').trim();
    if (!cleanText) return;
    this.enqueueTask(cleanText);
  }

  private async processQueue() {
    if (this.speaking || this.taskQueue.length === 0) return;

    this.speaking = true;
    const task = this.taskQueue.shift()!;

    const utterance = new SpeechSynthesisUtterance(task.text);
    this.currentUtterance = utterance;
    
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.name === "Google UK English Female") || 
                           voices.find(v => v.name.includes("Hazel")) || 
                           voices.find(v => v.lang === 'en-GB');
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onend = () => {
      this.activeUtterances.delete(utterance);
      this.onSpeechFinished();
      if (task.resolve) task.resolve();
    };

    utterance.onerror = (e) => {
      console.error("SpeechSynthesis error:", e);
      this.activeUtterances.delete(utterance);
      this.onSpeechFinished();
      if (task.resolve) task.resolve();
    };

    this.activeUtterances.add(utterance);
    window.speechSynthesis.speak(utterance);
  }

  public onSpeechFinished() {
    this.speaking = false;
    this.currentUtterance = null;
    // Yield to the event loop before processing the next item to prevent browser TTS freeze
    setTimeout(() => {
      this.processQueue();
    }, 10);
  }

  public clearQueue() {
    this.taskQueue = [];
    if (this.speaking) {
      window.speechSynthesis.cancel();
      this.speaking = false;
      this.currentUtterance = null;
    }
  }
}

export const speechQueue = new SpeechQueueManager();
