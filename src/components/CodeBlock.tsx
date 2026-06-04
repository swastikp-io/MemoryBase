import React, { useState, useEffect } from 'react';
import { Check, Copy, Download, Maximize2, Minimize2, ChevronDown, ChevronRight, FileCode2, WrapText, ListOrdered } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlockProps {
  language: string;
  code: string;
  isGenerating?: boolean;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ language, code, isGenerating }) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [wrapLines, setWrapLines] = useState(true);
  const [showLineNumbers, setShowLineNumbers] = useState(false);

  const cleanCode = code.replace(/\n$/, '');

  const handleCopy = () => {
    navigator.clipboard.writeText(cleanCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([cleanCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `snippet.${language || 'txt'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Keyboard shortcut for closing fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const renderCode = () => (
    <div className="relative font-mono text-[13px] md:text-[14px] leading-relaxed">
      <SyntaxHighlighter
        language={language || 'text'}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          padding: '1rem',
          background: 'transparent',
          fontSize: 'inherit',
          lineHeight: '1.7',
          fontFamily: 'inherit'
        }}
        wrapLines={wrapLines}
        wrapLongLines={wrapLines}
        showLineNumbers={showLineNumbers}
      >
        {cleanCode}
      </SyntaxHighlighter>
      {isGenerating && (
        <span className="absolute bottom-[1rem] right-4 w-2 h-4 bg-[var(--accent-primary)] animate-pulse" />
      )}
    </div>
  );

  const blockContent = (
    <div 
      className={`group relative flex flex-col rounded-2xl overflow-hidden border border-white/10 bg-[#1e1f20] shadow-lg transition-all duration-300 ${
        isFullscreen ? 'fixed inset-4 md:inset-10 z-[100] h-auto max-h-none shadow-2xl flex flex-col' : 'my-5 w-full'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white/5 border-b border-white/5 select-none">
        <div className="flex items-center gap-2 text-text-secondary">
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-0.5 hover:bg-white/10 rounded-md transition-colors text-text-secondary hover:text-text-primary"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <FileCode2 className="w-4 h-4 ml-1" />
          <span className="text-xs font-semibold uppercase tracking-wider text-text-primary/90">
            {language || 'text'}
          </span>
        </div>
        
        <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
          {isFullscreen && (
            <>
              <button
                onClick={() => setWrapLines(!wrapLines)}
                className={`p-1.5 rounded-lg transition-all active:scale-95 ${wrapLines ? 'text-[var(--accent-primary)] bg-[var(--accent-primary)]/10' : 'text-text-secondary hover:text-[var(--accent-fg)] hover:bg-[var(--accent-primary)]'}`}
                title={wrapLines ? "Disable word wrap" : "Enable word wrap"}
              >
                <WrapText className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowLineNumbers(!showLineNumbers)}
                className={`p-1.5 rounded-lg transition-all active:scale-95 mr-1 ${showLineNumbers ? 'text-[var(--accent-primary)] bg-[var(--accent-primary)]/10' : 'text-text-secondary hover:text-[var(--accent-fg)] hover:bg-[var(--accent-primary)]'}`}
                title={showLineNumbers ? "Hide line numbers" : "Show line numbers"}
              >
                <ListOrdered className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-4 bg-white/10 mx-1"></div>
            </>
          )}
          
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-text-secondary hover:text-[var(--accent-fg)] hover:bg-[var(--accent-primary)] transition-all active:scale-95"
            title="Copy code"
          >
            {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isCopied ? 'Copied!' : 'Copy'}</span>
          </button>
          
          <button
            onClick={handleDownload}
            className="p-1.5 rounded-lg text-text-secondary hover:text-[var(--accent-fg)] hover:bg-[var(--accent-primary)] transition-all active:scale-95"
            title="Download snippet"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg text-text-secondary hover:text-[var(--accent-fg)] hover:bg-[var(--accent-primary)] transition-all active:scale-95 ml-1"
            title={isFullscreen ? "Exit fullscreen" : "Expand to fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Code Area */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`overflow-x-auto overflow-y-auto ${isFullscreen ? 'flex-1 min-h-0' : 'max-h-[600px]'} scrollbar-thin scrollbar-thumb-white/20 hover:scrollbar-thumb-white/40`}
          >
            {renderCode()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <>
      {isFullscreen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90]"
          onClick={toggleFullscreen}
        />
      )}
      {blockContent}
    </>
  );
};
