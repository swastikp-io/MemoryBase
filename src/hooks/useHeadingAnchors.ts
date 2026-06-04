import { useCallback } from 'react';

export const useHeadingAnchors = () => {
  const scrollToHeading = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Update the URL without a full page reload if needed
      window.history.pushState({}, '', `#${id}`);
    }
  }, []);

  return { scrollToHeading };
};
