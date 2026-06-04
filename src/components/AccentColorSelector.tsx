import React, { useState, useRef, useEffect } from 'react';
import { useAccentTheme } from '../theme/useAccentTheme';
import { accentColors, AccentColor } from '../theme/accentColors';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const AccentColorSelector: React.FC = () => {
  const { getCurrentAccent, setAccent } = useAccentTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const currentAccent = getCurrentAccent();
  const colorKeys = Object.keys(accentColors) as AccentColor[];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setFocusedIndex(colorKeys.indexOf(currentAccent));
    }
  }, [isOpen, currentAccent]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        buttonRef.current?.focus();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % colorKeys.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => (prev - 1 + colorKeys.length) % colorKeys.length);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedIndex >= 0) {
          setAccent(colorKeys[focusedIndex]);
          setIsOpen(false);
          buttonRef.current?.focus();
        }
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  return (
    <div className="relative" ref={dropdownRef} onKeyDown={handleKeyDown}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-40 px-3 py-2 bg-bg-input border border-border-color rounded-xl text-sm font-medium text-text-primary hover:border-text-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
           <span className="capitalize">{accentColors[currentAccent].name}</span>
        </div>
        <ChevronDown className="w-4 h-4 text-text-secondary" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-48 bg-[#2F2F2F] border border-border-color rounded-xl shadow-2xl z-50 py-1 overflow-hidden focus:outline-none"
            role="listbox"
            tabIndex={-1}
          >
            {colorKeys.map((colorKey, index) => {
              const isSelected = currentAccent === colorKey;
              const isFocused = focusedIndex === index;
              return (
                <button
                  key={colorKey}
                  onClick={() => {
                    setAccent(colorKey);
                    setIsOpen(false);
                    buttonRef.current?.focus();
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors focus:outline-none ${isFocused ? 'bg-white/10' : 'hover:bg-white/5'}`}
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={-1}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-4 h-4">
                      {isSelected ? (
                        <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center bg-[var(--accent-primary)]">
                          <Check className="w-2.5 h-2.5" strokeWidth={3} style={{ color: colorKey === 'default' ? '#000' : '#fff' }} />
                        </div>
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-text-secondary" />
                      )}
                    </div>
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ 
                        backgroundColor: accentColors[colorKey].primary, 
                        border: colorKey === 'default' ? '1px solid #555' : 'none' 
                      }}
                    />
                    <span className={isSelected ? 'text-text-primary font-medium' : 'text-text-secondary'}>
                      {accentColors[colorKey].name}
                    </span>
                  </div>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
