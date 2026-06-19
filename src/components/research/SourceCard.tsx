import React from 'react';
import { ExternalLink, Copy, Check } from 'lucide-react';
import { motion } from 'motion/react';

export interface SourceData {
  title: string;
  url: string;
  snippet?: string;
  category?: string;
}

interface SourceCardProps {
  source: SourceData;
  index: number;
}

const categoryColors: Record<string, string> = {
  'Wikipedia': 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  'Research Paper': 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
  'Government': 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
  'Documentation': 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
  'News': 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800',
  'Web Sources': 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
};

export const SourceCard: React.FC<SourceCardProps> = ({ source, index }) => {
  const [copied, setCopied] = React.useState(false);
  
  let domain = 'Link';
  try {
    domain = new URL(source.url).hostname.replace(/^www\./, '');
  } catch (e) {}

  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  const badgeColor = categoryColors[source.category || 'Web Sources'] || categoryColors['Web Sources'];

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(source.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.a
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.05, 0.5) }}
      href={source.url}
      target="_blank"
      rel="noreferrer"
      className="group relative flex flex-col justify-between p-4 bg-[var(--surfaceSecondary)] border border-[var(--border)] rounded-xl transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-[var(--accent)] overflow-hidden"
    >
      <div className="flex items-start gap-3 w-full">
        <div className="flex-shrink-0 w-8 h-8 mt-0.5 rounded-lg bg-white p-1 border border-black/5 dark:border-white/10 shadow-sm overflow-hidden flex items-center justify-center">
          <img 
            src={faviconUrl} 
            alt={domain} 
            className="w-full h-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgY2xhc3M9Imx1Y2lkZSBsdWNpZGUtZ2xvYmUiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIi8+PGxpbmUgeDE9IjIigeTE9IjEyIiB4Mj0iMjIiIHkyPSIxMiIvPjxwYXRoIGQ9Ik0xMiAyYTE1LjMgMTUuMyAwIDAgMSA0IDEwIDE1LjMgMTUuMyAwIDAgMS00IDEwIDE1LjMgMTUuMyAwIDAgMS00LTEwIDE1LjMgMTUuMyAwIDAgMSA0LTEweiIvPjwvc3ZnPg==';
            }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h5 className="text-sm font-semibold text-text-primary leading-tight line-clamp-2 group-hover:text-[var(--accent)] transition-colors">
            {source.title || domain}
          </h5>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-xs text-text-secondary truncate max-w-[150px]">{domain}</span>
            <span className="w-1 h-1 rounded-full bg-border-color"></span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium whitespace-nowrap ${badgeColor}`}>
              {source.category || 'Web Sources'}
            </span>
          </div>
        </div>
      </div>

      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-[var(--surfaceSecondary)] rounded-lg p-1 border border-[var(--border)] shadow-sm">
        <button 
          onClick={handleCopy}
          className="p-1.5 hover:bg-[var(--surface)] hover:text-[var(--accent)] text-text-secondary rounded-md transition-colors"
          title="Copy URL"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
        <div className="p-1.5 hover:bg-[var(--surface)] hover:text-[var(--accent)] text-text-secondary rounded-md transition-colors" title="Open in new tab">
          <ExternalLink className="w-3.5 h-3.5" />
        </div>
      </div>
    </motion.a>
  );
};
