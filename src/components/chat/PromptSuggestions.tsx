import React from "react";
import { motion } from "motion/react";

const SUGGESTIONS = [
  "Research the latest AI trends",
  "Explain this codebase",
  "Create a product roadmap",
  "Analyze uploaded files"
];

interface PromptSuggestionsProps {
  onSelect: (suggestion: string) => void;
}

export const PromptSuggestions: React.FC<PromptSuggestionsProps> = ({ onSelect }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap items-center justify-center gap-2 z-20"
    >
      {SUGGESTIONS.map((suggestion, i) => (
        <button
          key={i}
          onClick={() => onSelect(suggestion)}
          className="px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] text-[13px] text-text-secondary hover:text-text-primary hover:bg-[var(--surfaceSecondary)] transition-colors shadow-sm"
        >
          {suggestion}
        </button>
      ))}
    </motion.div>
  );
};
