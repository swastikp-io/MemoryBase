import React, { useMemo, useState } from "react";
import { Source, SourceTrigger, SourceContent } from "../prompt-kit/source";
import { motion } from "motion/react";

interface WebSource {
  url: string;
  title?: string;
  description?: string;
  snippet?: string;
}

interface SourceListProps {
  sources?: WebSource[];
  isGenerating?: boolean;
}

export function SourceList({ sources, isGenerating }: SourceListProps) {
  const [expanded, setExpanded] = useState(false);

  const normalized = useMemo(() => {
    if (!sources || !sources.length) return [];
    
    const unique = new Map<string, WebSource>();
    sources.forEach(s => {
      if (!s || !s.url) return;
      try {
        if (!unique.has(s.url)) {
          unique.set(s.url, s);
        }
      } catch (e) {
        // Invalid or null URLs
      }
    });

    return Array.from(unique.values()).map(s => {
      let hostname = s.url;
      try {
        hostname = new URL(s.url).hostname.replace(/^www\./, "");
      } catch {}
      return {
        url: s.url,
        title: s.title || hostname,
        description: s.description || s.snippet || "",
      };
    });
  }, [sources]);

  if (!normalized.length || isGenerating) return null;

  const maxInitial = 10;
  const displayed = expanded ? normalized : normalized.slice(0, maxInitial);
  const hiddenCount = normalized.length - maxInitial;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="mt-6 flex flex-wrap gap-2"
    >
      {displayed.map((source) => (
        <Source key={source.url} href={source.url}>
          <SourceTrigger showFavicon />
          <SourceContent title={source.title} description={source.description} />
        </Source>
      ))}
      {!expanded && hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="flex items-center gap-1.5 h-8 px-3 rounded-full text-sm font-medium border border-[var(--border)] bg-[var(--surfaceSecondary)] hover:bg-[var(--surface)] text-text-secondary hover:text-text-primary transition-colors"
        >
          +{hiddenCount} more
        </button>
      )}
    </motion.div>
  );
}
