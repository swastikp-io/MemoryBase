import { useState, useEffect } from 'react';

export const useActiveHeading = (headingIds: string[]) => {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Find all visible entries
        const visibleEntries = entries.filter((entry) => entry.isIntersecting);
        if (visibleEntries.length > 0) {
          // If multiple are visible, pick the first one (top-most usually)
          setActiveId(visibleEntries[0].target.id);
        }
      },
      {
        root: document.getElementById('chat-scroll-container'),
        rootMargin: '-20px 0px -80% 0px', // Adjust margins to trigger when heading is near the top of the container
        threshold: 0.1,
      }
    );

    const elements = headingIds.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    elements.forEach((el) => observer.observe(el));

    return () => {
      elements.forEach((el) => observer.unobserve(el));
      observer.disconnect();
    };
  }, [headingIds]);

  return activeId;
};
