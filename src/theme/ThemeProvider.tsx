import React, { useEffect } from 'react';
import { useSettingsStore } from '../store/settings';
import { lightPresets, darkPresets, ThemePreset } from './themes';

function setCSSVariable(name: string, value: string) {
  document.documentElement.style.setProperty(name, value);
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { appearance } = useSettingsStore();
  
  // Default values to prevent issues if appearance is not yet loaded
  const themeMode = appearance?.themeMode || 'light';
  const currentLightPreset = appearance?.lightTheme || (themeMode === 'light' ? appearance?.themePreset : undefined) || 'codex';
  const currentDarkPreset = appearance?.darkTheme || (themeMode === 'dark' ? appearance?.themePreset : undefined) || 'default';

  useEffect(() => {
    const preset: ThemePreset = themeMode === 'light' 
      ? lightPresets[currentLightPreset as keyof typeof lightPresets] || lightPresets.codex
      : darkPresets[currentDarkPreset] || darkPresets.default;
      
    // Set base colors
    setCSSVariable('--theme-base-bg', preset.background);
    setCSSVariable('--theme-base-fg', preset.foreground);
    setCSSVariable('--theme-base-accent', preset.accent);

    // Derived variables using CSS color-mix
    setCSSVariable('--bg-primary', 'var(--theme-base-bg)');
    setCSSVariable('--background', 'var(--theme-base-bg)');
    setCSSVariable('--bg-sidebar', 'var(--theme-base-bg)');
    
    if (themeMode === 'light') {
      setCSSVariable('--bg-input', 'color-mix(in srgb, var(--theme-base-bg), black 4%)');
      setCSSVariable('--surface', 'color-mix(in srgb, var(--theme-base-bg), black 3%)');
      setCSSVariable('--surfaceSecondary', 'color-mix(in srgb, var(--theme-base-bg), black 6%)');
      setCSSVariable('--border', 'color-mix(in srgb, var(--theme-base-bg), black 12%)');
      setCSSVariable('--border-color', 'var(--border)'); 
      
      setCSSVariable('--textPrimary', 'var(--theme-base-fg)');
      setCSSVariable('--text-primary', 'var(--theme-base-fg)'); 
      setCSSVariable('--textSecondary', 'color-mix(in srgb, var(--theme-base-fg), var(--theme-base-bg) 40%)');
      setCSSVariable('--text-secondary', 'var(--textSecondary)'); 
      setCSSVariable('--textTertiary', 'color-mix(in srgb, var(--theme-base-fg), var(--theme-base-bg) 60%)');
      
      setCSSVariable('--accent', 'var(--theme-base-accent)');
      setCSSVariable('--accent-primary', 'var(--theme-base-accent)'); 
      setCSSVariable('--accentHover', 'color-mix(in srgb, var(--theme-base-accent), black 10%)');
      setCSSVariable('--accent-hover', 'var(--accentHover)'); 
      setCSSVariable('--accentMuted', 'color-mix(in srgb, var(--theme-base-accent), var(--theme-base-bg) 85%)');
      
      setCSSVariable('--accent-ring', 'color-mix(in srgb, var(--theme-base-accent), transparent 70%)');
      
      // Removed hardcoded Code Block variables. Using semantic tokens instead.
    } else {
      setCSSVariable('--bg-input', 'color-mix(in srgb, var(--theme-base-bg), white 8%)');
      setCSSVariable('--surface', 'color-mix(in srgb, var(--theme-base-bg), white 5%)');
      setCSSVariable('--surfaceSecondary', 'color-mix(in srgb, var(--theme-base-bg), white 10%)');
      setCSSVariable('--border', 'color-mix(in srgb, var(--theme-base-bg), white 15%)');
      setCSSVariable('--border-color', 'var(--border)'); 
      
      setCSSVariable('--textPrimary', 'var(--theme-base-fg)');
      setCSSVariable('--text-primary', 'var(--theme-base-fg)'); 
      setCSSVariable('--textSecondary', 'color-mix(in srgb, var(--theme-base-fg), var(--theme-base-bg) 35%)');
      setCSSVariable('--text-secondary', 'var(--textSecondary)'); 
      setCSSVariable('--textTertiary', 'color-mix(in srgb, var(--theme-base-fg), var(--theme-base-bg) 55%)');
      
      setCSSVariable('--accent', 'var(--theme-base-accent)');
      setCSSVariable('--accent-primary', 'var(--theme-base-accent)'); 
      setCSSVariable('--accentHover', 'color-mix(in srgb, var(--theme-base-accent), white 10%)');
      setCSSVariable('--accent-hover', 'var(--accentHover)'); 
      setCSSVariable('--accentMuted', 'color-mix(in srgb, var(--theme-base-accent), var(--theme-base-bg) 85%)');
      
      setCSSVariable('--accent-ring', 'color-mix(in srgb, var(--theme-base-accent), transparent 70%)');

      // Removed hardcoded Code Block variables in dark mode.
    }
    
    setCSSVariable('--success', '#10B981');
    setCSSVariable('--warning', '#F59E0B');
    setCSSVariable('--error', '#EF4444');

  }, [themeMode, currentLightPreset, currentDarkPreset]);

  return <>{children}</>;
};
