import React, { useState } from 'react';
import { useDocumentOutline } from '../../hooks/useDocumentOutline';
import { TableOfContents } from './TableOfContents';
import { List, X } from 'lucide-react';

interface DocumentOutlineProps {
  content: string;
}

export const DocumentOutline: React.FC<DocumentOutlineProps> = ({ content }) => {
  const outline = useDocumentOutline(content);
  const [isOpen, setIsOpen] = useState(false);

  // If there are less than 2 headings, maybe don't show the outline at all
  if (outline.length < 2) {
    return null;
  }

  return (
    <>
      {/* Mobile Toggle Button */}
      <div className="fixed bottom-24 right-4 z-40 xl:hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-3 bg-[var(--accent-primary)] text-[var(--accent-fg)] rounded-full shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity"
          aria-label="Toggle Table of Contents"
        >
          {isOpen ? <X className="w-5 h-5" /> : <List className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Sidebar */}
      {isOpen && (
        <div className="fixed inset-0 z-30 xl:hidden flex">
          <div className="absolute inset-0 bg-black/20" onClick={() => setIsOpen(false)} />
          <div className="relative w-64 max-w-[80vw] h-full bg-[var(--bg-secondary)] border-r border-border-color shadow-xl flex flex-col">
            <div className="flex-1 overflow-hidden pt-4">
              <TableOfContents outline={outline} />
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden xl:block w-[280px] flex-shrink-0 border-l border-border-color bg-[var(--bg-primary)] relative">
        <div className="sticky top-[24px] h-[calc(100vh-48px)] overflow-hidden">
          <TableOfContents outline={outline} />
        </div>
      </div>
    </>
  );
};
