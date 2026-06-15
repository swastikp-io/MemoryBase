import crypto from 'crypto';
import { MemoryRetrievalResult } from './hybridMemoryRetrieval.ts';

export interface MemoryDebugTrace {
  requestId: string;
  userId: string;
  userMessage: string;
  retrievedMemories: Array<{
    id: string;
    content: string;
    category?: string | null;
    score: number;
    source: string;
    similarity?: number;
  }>;
  contextBuilderOutput: string;
  finalPromptPreview: string;
  llmResponse: string;
  extractedMemories: Array<{
    id?: string;
    content: string;
    category?: string | null;
    importance?: number;
    embedding_status?: string;
  }>;
  storedMemories: Array<{
    id?: string;
    content: string;
    category?: string | null;
    importance?: number;
    embedding_status?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

const traces = new Map<string, MemoryDebugTrace>();
const MAX_TRACES = 100;

export class DebugTraceStore {
  static create(userId: string, userMessage: string): MemoryDebugTrace {
    const now = new Date().toISOString();
    const trace: MemoryDebugTrace = {
      requestId: crypto.randomUUID(),
      userId,
      userMessage,
      retrievedMemories: [],
      contextBuilderOutput: '',
      finalPromptPreview: '',
      llmResponse: '',
      extractedMemories: [],
      storedMemories: [],
      createdAt: now,
      updatedAt: now,
    };
    traces.set(trace.requestId, trace);
    this.trim();
    return trace;
  }

  static update(requestId: string, patch: Partial<Omit<MemoryDebugTrace, 'requestId' | 'createdAt'>>): MemoryDebugTrace | undefined {
    const existing = traces.get(requestId);
    if (!existing) return undefined;
    const updated = { ...existing, ...patch, updatedAt: new Date().toISOString() };
    traces.set(requestId, updated);
    return updated;
  }

  static get(requestId: string): MemoryDebugTrace | undefined {
    return traces.get(requestId);
  }

  static serializeRetrieval(results: MemoryRetrievalResult[]) {
    return results.map(result => ({
      id: result.memory.id,
      content: result.memory.content,
      category: result.memory.category,
      score: Number(result.score.toFixed(4)),
      source: result.source,
      similarity: result.similarity === undefined ? undefined : Number(result.similarity.toFixed(4)),
    }));
  }

  private static trim() {
    if (traces.size <= MAX_TRACES) return;
    const oldest = [...traces.entries()]
      .sort((a, b) => a[1].createdAt.localeCompare(b[1].createdAt))
      .slice(0, traces.size - MAX_TRACES);
    for (const [id] of oldest) {
      traces.delete(id);
    }
  }
}
