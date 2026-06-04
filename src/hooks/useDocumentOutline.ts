import { useState, useEffect } from 'react';
import { generateIdFromText } from '../components/markdown/HeadingRenderer';

export interface OutlineItem {
  id: string;
  title: string;
  level: number;
}

export const useDocumentOutline = (content: string) => {
  const [outline, setOutline] = useState<OutlineItem[]>([]);

  useEffect(() => {
    // Parse markdown for headings
    const headingRegex = /^(#{1,4})\s+(.+)$/gm;
    const items: OutlineItem[] = [];
    let match;

    while ((match = headingRegex.exec(content)) !== null) {
      const level = match[1].length;
      const title = match[2].trim();
      // Remove basic markdown from title for the id generator if needed, but here simple match is usually enough
      const id = generateIdFromText(title);
      items.push({ id, title, level });
    }

    setOutline(items);
  }, [content]);

  return outline;
};
