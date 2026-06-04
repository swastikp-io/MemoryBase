import React from 'react';
import { OutlineItem } from '../../hooks/useDocumentOutline';
import { useActiveHeading } from '../../hooks/useActiveHeading';
import { useHeadingAnchors } from '../../hooks/useHeadingAnchors';

interface TableOfContentsProps {
  outline: OutlineItem[];
}

export const TableOfContents: React.FC<TableOfContentsProps> = ({ outline }) => {
  const headingIds = outline.map((item) => item.id);
  const activeId = useActiveHeading(headingIds);
  const { scrollToHeading } = useHeadingAnchors();

  if (outline.length === 0) {
    return null;
  }

  return (
    <div className="w-full h-full p-4 overflow-y-auto custom-scrollbar">
      <h3 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wider">Contents</h3>
      <ul className="space-y-2 relative">
        {outline.map((item, index) => {
          const isActive = activeId === item.id;
          return (
            <li 
              key={`${item.id}-${index}`}
              className={`flex items-center transition-colors duration-200 cursor-pointer hover:text-[var(--accent-primary)] ${
                isActive ? 'text-[var(--accent-primary)] font-medium' : 'text-text-secondary'
              }`}
              style={{
                marginLeft: `${(item.level - 1) * 12}px` // indent based on level
              }}
              onClick={() => scrollToHeading(item.id)}
            >
              <div className="flex items-center text-sm w-full">
                <span className="truncate w-full block" title={item.title}>
                  {/* Subtle bullet for structure */}
                  <span className={`mr-2 inline-block rounded-full ${isActive ? 'bg-[var(--accent-primary)] w-1.5 h-1.5' : 'bg-transparent w-1.5 h-1.5'}`} />
                  {item.title}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
