import React, { createContext, useEffect, useState, ReactNode } from 'react';
import { AccentColor, accentColors } from './accentColors';

interface AccentThemeContextType {
  getCurrentAccent: () => AccentColor;
  setAccent: (color: AccentColor) => void;
  applyAccent: (color: AccentColor) => void;
}

export const AccentThemeContext = createContext<AccentThemeContextType | undefined>(undefined);

export const AccentThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentAccent, setCurrentAccent] = useState<AccentColor>('default');

  const applyAccent = (color: AccentColor) => {
    const config = accentColors[color];
    const root = document.documentElement;
    root.style.setProperty('--accent-primary', config.primary);
    root.style.setProperty('--accent-hover', config.hover);
    root.style.setProperty('--accent-light', config.light);
    root.style.setProperty('--accent-ring', config.ring);
    root.style.setProperty('--accent-gradient', config.gradient);
    root.style.setProperty('--accent-fg', config.fg);
  };

  const setAccent = (color: AccentColor) => {
    setCurrentAccent(color);
    localStorage.setItem('paralex-accent-color', color);
    applyAccent(color);
  };

  const getCurrentAccent = () => currentAccent;

  useEffect(() => {
    const saved = localStorage.getItem('paralex-accent-color') as AccentColor;
    if (saved && accentColors[saved]) {
      setCurrentAccent(saved);
      applyAccent(saved);
    } else {
      applyAccent('default');
    }
  }, []);

  return (
    <AccentThemeContext.Provider value={{ getCurrentAccent, setAccent, applyAccent }}>
      {children}
    </AccentThemeContext.Provider>
  );
};
