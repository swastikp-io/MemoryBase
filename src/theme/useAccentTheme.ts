import { useContext } from 'react';
import { AccentThemeContext } from './AccentThemeProvider';

export const useAccentTheme = () => {
  const context = useContext(AccentThemeContext);
  if (!context) {
    throw new Error('useAccentTheme must be used within an AccentThemeProvider');
  }
  return context;
};
