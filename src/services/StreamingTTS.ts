import { speechQueue } from './SpeechQueueManager';

export class StreamingTTS {
  private buffer = "";
  private isMuted = false;

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (muted) speechQueue.clearQueue();
  }

  public queueChunk(chunk: string) {
    if (this.isMuted) return;
    this.buffer += chunk;
    
    // Look for sentence boundaries (., !, ?) followed by a space or newline
    const sentenceEndRegex = /([.?!])(\s|\n)+/g;
    let match;
    let lastIndex = 0;
    
    while ((match = sentenceEndRegex.exec(this.buffer)) !== null) {
      const sentence = this.buffer.substring(lastIndex, match.index + match[1].length);
      speechQueue.enqueueText(sentence);
      lastIndex = match.index + match[0].length;
    }
    
    this.buffer = this.buffer.substring(lastIndex);
  }

  public flush() {
    if (this.buffer.trim() && !this.isMuted) {
      speechQueue.enqueueText(this.buffer);
    }
    this.buffer = "";
  }

  public stop() {
    speechQueue.clearQueue();
    this.buffer = "";
  }
}

export const streamingTTS = new StreamingTTS();
