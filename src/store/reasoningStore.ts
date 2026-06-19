import { create } from 'zustand';

export interface ReasoningStep {
  id: string;
  title: string;
  description?: string;

  type?:
    | "analysis"
    | "memory"
    | "search"
    | "tool"
    | "research"
    | "retrieval"
    | "generation"
    | "system";

  status:
    | "pending"
    | "active"
    | "completed"
    | "error";

  metadata?: Record<string, any>;

  startedAt: number;
  completedAt?: number;
  durationMs?: number;
}

interface ReasoningStore {
  steps: ReasoningStep[];
  addStep: (step: ReasoningStep) => void;
  updateStep: (id: string, updates: Partial<ReasoningStep>) => void;
  completeStep: (id: string) => void;
  clearSteps: () => void;
}

export const useReasoningStore = create<ReasoningStore>((set) => ({
  steps: [],
  addStep: (step) => set((state) => {
    // Prevent duplicate adds if same ID is received
    if (state.steps.some(s => s.id === step.id)) return state;
    return { steps: [...state.steps, step] };
  }),
  updateStep: (id, updates) => set((state) => ({
    steps: state.steps.map((step) => {
      if (step.id === id) {
        const updated = { ...step, ...updates };
        if (updated.completedAt && updated.startedAt) {
          updated.durationMs = updated.completedAt - updated.startedAt;
        }
        return updated;
      }
      return step;
    })
  })),
  completeStep: (id) => set((state) => ({
    steps: state.steps.map((step) => {
      if (step.id === id) {
        const completedAt = Date.now();
        return { 
          ...step, 
          status: "completed", 
          completedAt, 
          durationMs: completedAt - step.startedAt 
        };
      }
      return step;
    })
  })),
  clearSteps: () => set({ steps: [] })
}));
