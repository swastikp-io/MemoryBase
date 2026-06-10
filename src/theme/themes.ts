export type ThemeMode = 'light' | 'dark';
export type ThemePresetId = 'codex' | 'everforest' | 'catppuccin' | 'raycast' | 'rose-pine';

export interface ThemePreset {
  id: string;
  name: string;
  accent: string;
  background: string;
  foreground: string;
}

export const lightPresets: Record<ThemePresetId, ThemePreset> = {
  codex: { id: 'codex', name: 'Codex', accent: '#0169CC', background: '#FFFFFF', foreground: '#0D0D0D' },
  everforest: { id: 'everforest', name: 'Everforest', accent: '#93B259', background: '#FDF6E3', foreground: '#5C6A72' },
  catppuccin: { id: 'catppuccin', name: 'Catppuccin', accent: '#8839EF', background: '#EFF1F5', foreground: '#4C4F69' },
  raycast: { id: 'raycast', name: 'Raycast', accent: '#FF6363', background: '#FFFFFF', foreground: '#030303' },
  'rose-pine': { id: 'rose-pine', name: 'Rose Pine', accent: '#D7827E', background: '#FAF4ED', foreground: '#575279' },
};

export const darkPresets: Record<string, ThemePreset> = {
  default: { id: 'default', name: 'Default Dark', accent: '#0169CC', background: '#0a0a0a', foreground: '#ECECEC' },
};
