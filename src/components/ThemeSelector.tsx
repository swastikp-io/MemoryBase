import React from 'react';
import { useSettingsStore } from '../store/settings';
import { lightPresets, darkPresets, ThemeMode, ThemePresetId } from '../theme/themes';
import { Check } from 'lucide-react';

export const ThemeSelector: React.FC = () => {
  const { appearance, updateAppearance } = useSettingsStore();
  const themeMode = appearance?.themeMode || 'light';
  
  const currentLightPreset = appearance?.lightTheme || (themeMode === 'light' ? appearance?.themePreset : undefined) || 'codex';
  const currentDarkPreset = appearance?.darkTheme || (themeMode === 'dark' ? appearance?.themePreset : undefined) || 'default';
  
  const activePreset = themeMode === 'light' ? currentLightPreset : currentDarkPreset;

  const presets = themeMode === 'light' ? lightPresets : darkPresets;
  const presetKeys = Object.keys(presets) as Array<keyof typeof presets>;

  return (
    <div className="space-y-6">
      {/* Theme Mode Selection */}
      <div className="flex gap-6">
        {(['light', 'dark'] as ThemeMode[]).map((mode) => (
          <label key={mode} className="flex items-center gap-2 cursor-pointer group">
            <div className="relative flex items-center justify-center w-5 h-5">
              <input
                type="radio"
                name="themeMode"
                value={mode}
                checked={themeMode === mode}
                onChange={() => {
                  updateAppearance({ themeMode: mode });
                }}
                className="peer appearance-none w-5 h-5 rounded-full border border-border-color checked:border-[var(--accent)] checked:border-[6px] transition-all bg-bg-input cursor-pointer"
              />
            </div>
            <span className="text-[15px] font-medium text-text-primary capitalize group-hover:text-text-primary transition-colors">
              {mode} Theme
            </span>
          </label>
        ))}
      </div>

      {/* Theme Preset Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {presetKeys.map((key) => {
          const preset = presets[key as any];
          const isActive = activePreset === key;
          
          return (
            <button
              key={key}
              onClick={() => {
                if (themeMode === 'light') {
                  updateAppearance({ lightTheme: key, themePreset: key });
                } else {
                  updateAppearance({ darkTheme: key, themePreset: key });
                }
              }}
              className={`flex flex-col text-left p-4 rounded-2xl border-2 transition-all relative ${
                isActive ? 'border-[var(--accent)] shadow-md z-10' : 'border-border-color hover:border-text-secondary/50'
              }`}
              style={{
                backgroundColor: preset.background,
                color: preset.foreground,
              }}
            >
              <div className="flex justify-between items-start mb-6">
                <span className="font-semibold text-[15px] leading-none">{preset.name}</span>
                {isActive && (
                  <span className="flex items-center gap-1 text-[11px] uppercase font-bold tracking-wider" style={{ color: preset.accent }}>
                    <Check className="w-3.5 h-3.5" strokeWidth={3} /> Active
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-3 mt-auto">
                <div className="flex flex-col gap-1 items-center">
                  <div className="w-6 h-6 rounded-full border border-black/10 dark:border-white/10 shadow-sm" style={{ backgroundColor: preset.accent }} title="Accent" />
                </div>
                <div className="flex flex-col gap-1 items-center">
                  <div className="w-6 h-6 rounded-full border border-black/10 dark:border-white/10 shadow-sm" style={{ backgroundColor: preset.background }} title="Background" />
                </div>
                <div className="flex flex-col gap-1 items-center">
                  <div className="w-6 h-6 rounded-full border border-black/10 dark:border-white/10 shadow-sm" style={{ backgroundColor: preset.foreground }} title="Foreground" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
