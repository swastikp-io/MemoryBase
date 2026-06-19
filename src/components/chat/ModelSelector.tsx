import React from "react";
import { ChevronDown, Check } from "lucide-react";
import { ChatMode } from "../../lib/models/modes";
import { MODEL_REGISTRY } from "../../lib/models/registry";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
} from "../ui/dropdown-menu";

interface ModelSelectorProps {
  selectedMode: ChatMode;
  onSelectMode: (mode: ChatMode) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ selectedMode, onSelectMode }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[13px] font-medium border border-[var(--border)] transition-colors bg-transparent text-text-secondary hover:text-text-primary hover:bg-[var(--surfaceSecondary)] data-[state=open]:bg-[var(--surfaceSecondary)] data-[state=open]:text-text-primary"
        >
          {MODEL_REGISTRY[selectedMode]?.label || 'Standard'}
          <ChevronDown className="w-3 h-3 opacity-70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent 
          sideOffset={8}
          align="end"
          className="w-48 bg-[var(--surface)] border border-[var(--border)] shadow-2xl rounded-2xl py-1 z-[9999] flex flex-col overflow-visible"
        >
          {(Object.entries(MODEL_REGISTRY) as [ChatMode, { label: string }][]).map(([mode, config]) => (
            <DropdownMenuItem
              key={mode}
              onClick={() => onSelectMode(mode)}
              className="flex items-center justify-between h-9 px-3 mx-1 rounded-lg hover:bg-[var(--surfaceSecondary)] transition-colors text-[13px] text-text-primary text-left cursor-pointer"
            >
              {config.label}
              {selectedMode === mode && <Check className="w-4 h-4 text-text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
};
