import { ChatMode } from "./modes.ts";
import { MODEL_REGISTRY } from "./registry.ts";

export function resolveModel(mode: ChatMode): string {
  switch (mode) {
    case "standard":
      return MODEL_REGISTRY.standard.id;
    case "research":
      return MODEL_REGISTRY.research.id;
    case "reasoning":
      return MODEL_REGISTRY.reasoning.id;
    case "coding":
      return MODEL_REGISTRY.coding.id;
    default:
      return MODEL_REGISTRY.standard.id;
  }
}
