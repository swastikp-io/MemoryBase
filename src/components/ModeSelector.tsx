import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, BrainCircuit } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ModeSelectorProps {
  selectedMode: 'research' | 'reasoning' | 'coding';
  onSelectMode: (mode: 'research' | 'reasoning' | 'coding') => void;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({ selectedMode, onSelectMode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

    { id: 'research', label: 'Research', icon: Search },
    { id: 'reasoning', label: 'Reasoning', icon: BrainCircuit },
    { id: 'coding', label: 'Coding Agent', icon: BrainCircuit }

  const activeMode = modes.find(m => m.id === selectedMode) || modes[0];
  const Icon = activeMode.icon;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)]/50 transition-all text-sm font-medium text-text-primary shadow-sm"
      >
        <Icon className="w-4 h-4 text-[var(--accent)]" />
        {activeMode.label} Mode
        <ChevronDown className={`w-4 h-4 text-text-secondary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-2 w-48 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden z-50 p-1"
          >
            {modes.map((mode) => {
              const ModeIcon = mode.icon;
              return (
                <button
                  key={mode.id}
                  onClick={() => {
                    onSelectMode(mode.id as 'research' | 'reasoning' | 'coding');
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedMode === mode.id
                      ? 'bg-[var(--accentMuted)] text-[var(--accent)]'
                      : 'text-text-secondary hover:bg-[var(--surfaceSecondary)] hover:text-text-primary'
                  }`}
                >
                  <ModeIcon className="w-4 h-4" />
                  {mode.label}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
