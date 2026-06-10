import React from 'react';
import { motion } from 'motion/react';
import { SettingsState } from '../store/settings';
import { MODEL_REGISTRY } from '../lib/models';
import { Check } from 'lucide-react';

const SectionTitle = ({ title, description }: { title: string; description?: string }) => (
  <div className="mb-6">
    <h3 className="text-xl font-medium text-text-primary mb-1">{title}</h3>
    {description && <p className="text-sm text-text-secondary">{description}</p>}
  </div>
);

export const AISettings = ({ settings }: { settings: SettingsState }) => {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <SectionTitle title="AI Models" description="Select the default model for various tasks." />

      <div className="space-y-4">
        <label className="block text-sm font-medium text-text-secondary mb-1.5">Default Model</label>
        <div className="grid grid-cols-1 gap-4">
          {MODEL_REGISTRY.map(model => (
            <button
              key={model.id}
              onClick={() => settings.updateAiBehavior({ defaultModel: model.id })}
              className={`flex flex-col text-left p-4 rounded-xl border transition-all ${
                settings.aiBehavior.defaultModel === model.id 
                  ? 'border-[var(--accent)] bg-[var(--surfaceSecondary)]' 
                  : 'border-[var(--border)] bg-[var(--bg-input)] hover:border-[var(--textSecondary)]'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <span className="font-semibold text-text-primary">{model.displayName}</span>
                {settings.aiBehavior.defaultModel === model.id && <Check className="w-5 h-5 text-[var(--accent)]" />}
              </div>
              <p className="text-sm text-text-secondary mb-3">{model.description}</p>
              <div className="flex flex-wrap gap-2 mt-auto">
                {model.category === "Coding & Engineering" && (
                   <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--accent)]/10 text-[var(--accent)]">
                     Best For Coding
                   </span>
                )}
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--surfaceSecondary)] text-text-secondary border border-[var(--border)]">
                  {model.provider}
                </span>
                {Object.entries(model.capabilities).map(([key, value]) => {
                  if (value) {
                    return (
                      <span key={key} className="px-2 py-0.5 rounded text-[11px] font-medium bg-black/5 dark:bg-white/5 text-text-secondary border border-[var(--border)]">
                        {key.replace('_', ' ')}
                      </span>
                    )
                  }
                  return null;
                })}
              </div>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
};
