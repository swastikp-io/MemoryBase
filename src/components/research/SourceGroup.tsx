import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { SourceCard, SourceData } from './SourceCard';
import { motion, AnimatePresence } from 'motion/react';

interface SourceGroupProps {
  title: string;
  sources: SourceData[];
  defaultExpanded?: boolean;
  globalExpanded?: boolean;
}

export const SourceGroup: React.FC<SourceGroupProps> = ({ title, sources, defaultExpanded = true, globalExpanded }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Sync with global toggle if it changes
  React.useEffect(() => {
    if (globalExpanded !== undefined) {
      setIsExpanded(globalExpanded);
    }
  }, [globalExpanded]);

  if (!sources || sources.length === 0) return null;

  return (
    <div className="flex flex-col mb-6">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm font-semibold text-text-primary hover:text-[var(--accent)] transition-colors mb-3 w-fit group"
      >
        <span className="p-0.5 rounded-md bg-[var(--surfaceSecondary)] group-hover:bg-[var(--surface)] transition-colors">
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </span>
        {title} <span className="text-text-secondary font-normal text-xs bg-[var(--surfaceSecondary)] px-1.5 py-0.5 rounded-md">{sources.length}</span>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-1">
              {sources.map((source, index) => (
                <SourceCard key={index} source={source} index={index} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
