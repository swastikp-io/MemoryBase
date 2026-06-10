import { useEffect } from 'react';

// Helper to parse rgb/rgba strings
const parseRGB = (rgb: string) => {
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return null;
  return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
};

// Calculate relative luminance
const getLuminance = (r: number, g: number, b: number) => {
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
};

// Calculate contrast ratio
const getContrastRatio = (color1: number[], color2: number[]) => {
  const lum1 = getLuminance(color1[0], color1[1], color1[2]);
  const lum2 = getLuminance(color2[0], color2[1], color2[2]);
  const lightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (lightest + 0.05) / (darkest + 0.05);
};

export const useThemeValidator = () => {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const checkForHardcodedColorsAndContrast = () => {
      const allElements = document.querySelectorAll('*');
      const hardcodedViolations = new Set<string>();
      const contrastViolations = new Set<string>();

      allElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        const textNodeCount = Array.from(htmlEl.childNodes).filter(n => n.nodeType === Node.TEXT_NODE && n.textContent?.trim() !== '').length;
        
        // 1. Hardcoded Class Check
        if (typeof htmlEl.className === 'string') {
          const classes = htmlEl.className.split(' ');
          const hardcodedPatterns = [
            /^bg-\[#/,
            /^text-\[#/,
            /^border-\[#/,
            /^bg-black$/,
            /^bg-white$/,
            /^text-black$/,
            /^text-white$/,
            /^text-zinc-/,
            /^text-gray-/,
            /^text-neutral-/
          ];

          classes.forEach((cls) => {
            for (const pattern of hardcodedPatterns) {
              if (pattern.test(cls)) {
                hardcodedViolations.add(`Element <${htmlEl.tagName.toLowerCase()}> uses hardcoded class: ${cls}`);
              }
            }
          });
        }

        // 2. Contrast Validation (only for elements that actually contain text)
        if (textNodeCount > 0) {
          const styles = window.getComputedStyle(htmlEl);
          const textColor = parseRGB(styles.color);
          
          // To get background color, we may need to traverse up if transparent
          let bgEl: HTMLElement | null = htmlEl;
          let bgColor = parseRGB(window.getComputedStyle(bgEl).backgroundColor);
          
          while (bgEl && (!bgColor || bgColor.length < 3 || window.getComputedStyle(bgEl).backgroundColor === 'rgba(0, 0, 0, 0)')) {
            bgEl = bgEl.parentElement;
            if (bgEl) {
              bgColor = parseRGB(window.getComputedStyle(bgEl).backgroundColor);
            }
          }

          // Default to white background if we couldn't resolve
          if (!bgColor || bgColor.length < 3) bgColor = [255, 255, 255];

          if (textColor && bgColor) {
            const ratio = getContrastRatio(textColor, bgColor);
            // Normal text requires 4.5:1, large text requires 3:1
            if (ratio < 4.5) {
              const fontSize = parseFloat(styles.fontSize);
              if (fontSize < 18 && ratio < 4.5) {
                contrastViolations.add(`Poor Contrast (${ratio.toFixed(2)}:1) on <${htmlEl.tagName.toLowerCase()}> "${htmlEl.textContent?.trim().slice(0, 20)}..."`);
              } else if (fontSize >= 18 && ratio < 3.0) {
                contrastViolations.add(`Poor Contrast (${ratio.toFixed(2)}:1) on <${htmlEl.tagName.toLowerCase()}> "${htmlEl.textContent?.trim().slice(0, 20)}..."`);
              }
            }
          }
        }
      });

      if (hardcodedViolations.size > 0) {
        console.warn('🎨 Theme Validator: Found hardcoded colors bypassed ThemeProvider:');
        hardcodedViolations.forEach(v => console.warn(v));
      }

      if (contrastViolations.size > 0) {
        console.warn('👁️ Theme Validator: Found contrast ratio violations:');
        contrastViolations.forEach(v => console.warn(v));
      }
    };

    // Run once on mount and then on mutations
    setTimeout(checkForHardcodedColorsAndContrast, 1000);

    const observer = new MutationObserver((mutations) => {
      let shouldCheck = false;
      for (const m of mutations) {
        if (m.type === 'childList' || m.type === 'attributes') {
          shouldCheck = true;
          break;
        }
      }
      if (shouldCheck) {
        // debounce slightly
        setTimeout(checkForHardcodedColorsAndContrast, 1500);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);
};
