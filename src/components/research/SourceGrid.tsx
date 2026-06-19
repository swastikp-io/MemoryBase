import React, { useState, useMemo } from 'react';
import { SourceGroup } from './SourceGroup';
import { SourceData } from './SourceCard';
import { Network, Layers, ChevronDown } from 'lucide-react';

interface SourceGridProps {
  sources: { title: string; url: string; snippet?: string; isWikipedia?: boolean }[];
}

const categorizeSource = (url: string, isWikipedia?: boolean): string => {
  if (isWikipedia) return 'Wikipedia';
  
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    
    if (hostname.includes('wikipedia.org')) return 'Wikipedia';
    if (hostname.endsWith('.gov') || hostname.endsWith('.mil')) return 'Government';
    if (hostname.includes('arxiv.org') || hostname.includes('nature.com') || hostname.endsWith('.edu') || hostname.includes('researchgate.net') || hostname.includes('sciencedirect.com') || hostname.includes('ncbi.nlm.nih.gov')) return 'Research Paper';
    if (hostname.includes('github.com') || hostname.includes('stackoverflow.com') || hostname.includes('docs.') || hostname.endsWith('.dev')) return 'Documentation';
    if (hostname.includes('nytimes.com') || hostname.includes('bbc.com') || hostname.includes('reuters.com') || hostname.includes('cnn.com') || hostname.includes('bloomberg.com') || hostname.includes('wsj.com') || hostname.includes('theguardian.com')) return 'News';
    
    return 'Web Sources';
  } catch (e) {
    return 'Web Sources';
  }
};

export const SourceGrid: React.FC<SourceGridProps> = ({ sources }) => {
  const [globalExpanded, setGlobalExpanded] = useState<boolean>(true);
  const [showAll, setShowAll] = useState<boolean>(false);

  const processedSources = useMemo(() => {
    return sources.map(s => ({
      ...s,
      category: categorizeSource(s.url, s.isWikipedia)
    })) as SourceData[];
  }, [sources]);

  const groups = useMemo(() => {
    const grouped: Record<string, SourceData[]> = {
      'Research Paper': [],
      'Government': [],
      'Wikipedia': [],
      'Documentation': [],
      'News': [],
      'Web Sources': []
    };

    processedSources.forEach(s => {
      if (grouped[s.category!]) {
        grouped[s.category!].push(s);
      } else {
        grouped['Web Sources'].push(s);
      }
    });

    return grouped;
  }, [processedSources]);

  if (!sources || sources.length === 0) return null;

  const totalSources = sources.length;
  const isLargeSet = totalSources > 20;
  
  // Flatten groups for pagination slicing if needed
  let displayGroups = Object.entries(groups).filter(([_, items]) => items.length > 0);
  
  // If too many sources and not showAll, we might just slice the first 20 across groups
  if (isLargeSet && !showAll) {
    let count = 0;
    const truncatedGroups: typeof displayGroups = [];
    
    for (const [title, items] of displayGroups) {
      if (count >= 20) break;
      const spaceLeft = 20 - count;
      const toAdd = items.slice(0, spaceLeft);
      truncatedGroups.push([title, toAdd]);
      count += toAdd.length;
    }
    displayGroups = truncatedGroups;
  }

  return (
    <div className="mt-8 pt-6 border-t border-[var(--border)] w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Network className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
            Research Sources 
            <span className="bg-[var(--surfaceSecondary)] border border-[var(--border)] text-text-secondary text-xs px-2 py-0.5 rounded-full font-semibold">
              {totalSources}
            </span>
          </h3>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setGlobalExpanded(!globalExpanded)}
            className="flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors bg-[var(--surfaceSecondary)] hover:bg-[var(--surface)] px-2.5 py-1.5 rounded-lg border border-[var(--border)]"
          >
            <Layers className="w-3.5 h-3.5" />
            {globalExpanded ? 'Collapse All' : 'Expand All'}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {displayGroups.map(([title, items]) => (
          <SourceGroup 
            key={title} 
            title={title} 
            sources={items} 
            globalExpanded={globalExpanded} 
          />
        ))}
      </div>

      {isLargeSet && !showAll && (
        <div className="flex justify-center mt-2 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--background)] to-transparent pointer-events-none h-24 -top-24"></div>
          <button 
            onClick={() => setShowAll(true)}
            className="relative flex items-center gap-2 px-5 py-2.5 bg-[var(--surfaceSecondary)] hover:bg-[var(--surface)] text-text-primary text-sm font-semibold rounded-full border border-[var(--border)] transition-all hover:shadow-md z-10"
          >
            View all {totalSources} sources
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
