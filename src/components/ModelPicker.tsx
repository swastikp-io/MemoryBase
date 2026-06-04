import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface AIModel {
  id: string;
  name: string;
  model_name: string;
  provider: string;
  description: string;
  icon?: string;
  active: boolean;
}

interface ModelPickerProps {
  models: AIModel[];
  selectedModelId: string;
  onSelectModel: (id: string) => void;
}

export const ModelPicker: React.FC<ModelPickerProps> = ({ models, selectedModelId, onSelectModel }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedModel = models.find(m => m.id === selectedModelId) || models[0];

  if (models.length === 0) return null;

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-text-secondary hover:text-text-primary font-medium text-[13px] group"
      >
        <span className="group-hover:text-text-primary transition-colors text-[14px]">{selectedModel?.name || 'Fast'}</span>
        <ChevronDown className="w-3.5 h-3.5 opacity-70" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-[#2F2F2F] shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-2xl py-2 z-50 border border-border-color flex flex-col origin-top-left animate-in fade-in zoom-in-95 duration-200">
          {models.map((model) => (
            <button
              key={model.id}
              type="button"
              onClick={() => {
                onSelectModel(model.id);
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
            >
              <div className="flex items-center gap-4">
                {model.icon && (
                  <div className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/10 flex items-center justify-center text-lg flex-shrink-0">
                    {model.icon}
                  </div>
                )}
                <div className="flex flex-col items-start text-left">
                  <span className="text-[15px] text-text-primary font-medium group-hover:text-text-primary">{model.name}</span>
                  <span className="text-[13px] text-text-secondary line-clamp-1">{model.description}</span>
                </div>
              </div>
              {selectedModelId === model.id && <Check className="w-5 h-5 text-text-primary flex-shrink-0 ml-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
