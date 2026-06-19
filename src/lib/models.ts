export interface ModelDefinition {
  id: string;
  displayName: string;
  description: string;
  provider: string;
  category: string;
  capabilities: {
    coding?: boolean;
    reasoning?: boolean;
    vision?: boolean;
    ui_generation?: boolean;
    data_visualization?: boolean;
    code_refactoring?: boolean;
    architecture_design?: boolean;
    [key: string]: boolean | undefined;
  };
}

export const MODEL_REGISTRY: ModelDefinition[] = [
  {
    id: "cohere/north-mini-code:free",
    displayName: "Coding",
    description: "Advanced coding, software engineering, UI generation, and agentic development model.",
    provider: "OpenRouter",
    category: "Coding & Engineering",
    capabilities: {
      coding: true,
      reasoning: true,
      vision: true,
      ui_generation: true,
      data_visualization: true,
      code_refactoring: true,
      architecture_design: true
    }
  },
  {
    id: "openai/gpt-oss-120b:free",
    displayName: "Deep reasoning",
    description: "Advanced reasoning for complex problems.",
    provider: "OpenRouter",
    category: "Reasoning",
    capabilities: {
      reasoning: true
    }
  },
  {
    id: "google/gemma-4-31b-it:free",
    displayName: "Deep research",
    description: "Advanced research model.",
    provider: "OpenRouter",
    category: "Research",
    capabilities: {
      reasoning: true
    }
  }
];
