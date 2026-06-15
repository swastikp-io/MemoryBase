import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Database } from 'lucide-react';

interface MemoryTracePanelProps {
  requestId: string;
}

export const MemoryTracePanel: React.FC<MemoryTracePanelProps> = ({ requestId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [trace, setTrace] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadTrace = async () => {
    if (trace || isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/chat/debug/${requestId}`, {
        headers: { Authorization: 'Bearer dummy_token' },
      });
      if (!response.ok) {
        throw new Error(`Trace unavailable (${response.status})`);
      }
      setTrace(await response.json());
    } catch (err: any) {
      setError(err.message || 'Trace unavailable');
    } finally {
      setIsLoading(false);
    }
  };

  const toggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next) loadTrace();
  };

  const memories = trace?.retrievedMemories || [];
  const extracted = trace?.extractedMemories || [];
  const stored = trace?.storedMemories || [];

  return (
    <div className="mt-3 w-full rounded-lg border border-border-color bg-[var(--surfaceSecondary)]/70 text-sm">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-text-secondary hover:text-text-primary"
      >
        <span className="flex items-center gap-2 font-medium">
          <Database className="h-4 w-4" />
          Memory trace
        </span>
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>

      {isOpen && (
        <div className="space-y-3 border-t border-border-color px-3 py-3">
          {isLoading && <div className="text-text-secondary">Loading trace...</div>}
          {error && <div className="text-red-500">{error}</div>}
          {trace && (
            <>
              <section>
                <div className="mb-1 text-xs font-semibold uppercase text-text-secondary">User Message</div>
                <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded-md bg-[var(--background)] p-2 text-xs">{trace.userMessage}</pre>
              </section>

              <section>
                <div className="mb-1 text-xs font-semibold uppercase text-text-secondary">Retrieved Memories ({memories.length})</div>
                <div className="space-y-1">
                  {memories.length === 0 ? (
                    <div className="text-xs text-text-secondary">No memories retrieved.</div>
                  ) : memories.map((memory: any) => (
                    <div key={memory.id} className="rounded-md bg-[var(--background)] p-2 text-xs">
                      <div>{memory.content}</div>
                      <div className="mt-1 text-text-secondary">score {memory.score} · {memory.source}{memory.similarity !== undefined ? ` · similarity ${memory.similarity}` : ''}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <div className="mb-1 text-xs font-semibold uppercase text-text-secondary">Context Builder Output</div>
                <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-[var(--background)] p-2 text-xs">{trace.contextBuilderOutput || 'Empty'}</pre>
              </section>

              <section>
                <div className="mb-1 text-xs font-semibold uppercase text-text-secondary">Final Prompt Preview</div>
                <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-[var(--background)] p-2 text-xs">{trace.finalPromptPreview || 'Empty'}</pre>
              </section>

              <section>
                <div className="mb-1 text-xs font-semibold uppercase text-text-secondary">LLM Response</div>
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-md bg-[var(--background)] p-2 text-xs">{trace.llmResponse || 'Pending'}</pre>
              </section>

              <section>
                <div className="mb-1 text-xs font-semibold uppercase text-text-secondary">Extracted Memories ({extracted.length})</div>
                <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded-md bg-[var(--background)] p-2 text-xs">{JSON.stringify(extracted, null, 2)}</pre>
              </section>

              <section>
                <div className="mb-1 text-xs font-semibold uppercase text-text-secondary">Stored Memories ({stored.length})</div>
                <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded-md bg-[var(--background)] p-2 text-xs">{JSON.stringify(stored, null, 2)}</pre>
              </section>
            </>
          )}
        </div>
      )}
    </div>
  );
};
