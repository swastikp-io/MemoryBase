import React from 'react';
import { Folder, File, FileText, FileCode, FileImage } from 'lucide-react';

interface FileTreeProps {
  content: string;
}

const getIconForNode = (name: string, isDir: boolean) => {
  if (isDir) return <Folder className="w-4 h-4 text-blue-500 fill-blue-500/20" />;
  
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx':
    case 'json':
    case 'html':
    case 'css':
      return <FileCode className="w-4 h-4 text-yellow-500" />;
    case 'md':
    case 'txt':
      return <FileText className="w-4 h-4 text-gray-400" />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'svg':
      return <FileImage className="w-4 h-4 text-green-500" />;
    default:
      return <File className="w-4 h-4 text-gray-400" />;
  }
};

export const FileTree: React.FC<FileTreeProps> = ({ content }) => {
  const lines = content.split('\n').filter(l => l.trim().length > 0);

  return (
    <div className="my-4 rounded-xl border border-[var(--border)] bg-[var(--surfaceSecondary)] overflow-hidden shadow-sm">
      <div className="px-4 py-2 bg-[var(--surface)] border-b border-[var(--border)] text-xs font-semibold text-text-secondary uppercase tracking-wider">
        Project Structure
      </div>
      <div className="p-4 overflow-x-auto font-mono text-[13px] md:text-[14px] leading-loose whitespace-pre text-text-primary">
        {lines.map((line, idx) => {
          // Attempt to parse out the tree formatting characters vs the actual name
          const match = line.match(/^([\s│├└─]*)(.+)$/);
          if (!match) return <div key={idx}>{line}</div>;
          
          const [, prefix, namePart] = match;
          const cleanName = namePart.trim();
          const isDir = cleanName.endsWith('/');
          const displayName = isDir ? cleanName.slice(0, -1) : cleanName;
          
          return (
            <div key={idx} className="flex items-center gap-1.5 hover:bg-black/5 dark:hover:bg-white/5 px-2 rounded-md transition-colors w-max pr-8">
              <span className="text-text-secondary/60 select-none">{prefix}</span>
              <span className="flex items-center gap-2">
                {getIconForNode(displayName, isDir)}
                <span className={isDir ? 'font-medium text-text-primary' : 'text-text-secondary'}>
                  {displayName}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
