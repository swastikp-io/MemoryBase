import React, { useState, useEffect } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { Copy, Check, Bot, ThumbsUp, ThumbsDown, Globe, Edit2, Volume2, Square } from "lucide-react";
import { useSettingsStore } from "../store/settings";
import { CodeBlock } from "./CodeBlock";
import { motion, AnimatePresence } from "motion/react";
import { HeadingRenderer } from "./markdown/HeadingRenderer";
import { AnchorLink } from "./markdown/AnchorLink";
import { FileTree } from "./markdown/FileTree";
import { ReasoningPanel } from "./reasoning/ReasoningPanel";
import { TypingLoader } from "./chat/TypingLoader";
import { ReasoningPhase, ResearchSession } from "../store/chatStore";
import { ReasoningStep } from "../store/reasoningStore";
import { ReportExport } from "./research/ReportExport";
import { ShareButton } from "./ui/share-button";
import { SourceList } from "./chat/SourceList";
import { Tooltip } from "./ui/tooltip";


interface ChatMessageProps {
  id: string;
  role: "user" | "model";
  content: string;
  images?: string[];
  isGenerating?: boolean;
  isSearchingWeb?: boolean;
  reasoning?: ReasoningPhase;
  research?: ResearchSession;
  mode?: string;
  sources?: Array<{ title: string; url: string; snippet?: string }>;
  reasoningSteps?: ReasoningStep[];
  onEdit?: (id: string, newContent: string) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ id, role, content, images, isGenerating, isSearchingWeb, reasoning, research, mode, sources, reasoningSteps, onEdit }) => {
  const isUser = role === "user";
  const [isCopied, setIsCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(content);
  const [debouncedContent, setDebouncedContent] = useState(content);
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);

  useEffect(() => {
    return () => {
      if (isPlayingTTS && typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isPlayingTTS]);

  const toggleTTS = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (isPlayingTTS) {
      window.speechSynthesis.cancel();
      setIsPlayingTTS(false);
      return;
    }

    const plainText = content
      .replace(/```[\s\S]*?```/g, ' [Code Block] ')
      .replace(/[*#_`]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    const utterance = new SpeechSynthesisUtterance(plainText);
    utterance.onend = () => setIsPlayingTTS(false);
    utterance.onerror = () => setIsPlayingTTS(false);

    window.speechSynthesis.speak(utterance);
    setIsPlayingTTS(true);
  };

  const handleEditSubmit = () => {
    if (editValue.trim() !== content && editValue.trim() !== "") {
      onEdit?.(id, editValue.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEditSubmit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(content);
    }
  };

  // Debounce the streaming content to prevent Markdown AST tearing/jumping
  useEffect(() => {
    if (isGenerating) {
      const timer = setTimeout(() => {
        setDebouncedContent(content);
      }, 120);
      return () => clearTimeout(timer);
    } else {
      setDebouncedContent(content);
    }
  }, [content, isGenerating]);

  const preprocessLaTeX = (text: string) => {
    if (!text) return "";
    return text
      .replace(/\\\[/g, "$$")
      .replace(/\\\]/g, "$$")
      .replace(/\\\(/g, "$")
      .replace(/\\\)/g, "$");
  };

  let processedContent = preprocessLaTeX(debouncedContent);
  if (mode === 'standard') {
    processedContent = processedContent.replace(/<(reasoning|thinking|think|analysis|plan|scratchpad|chain_of_thought)>[\s\S]*?(<\/\1>|$)/gi, '');
    const scaffoldingRegex = /^(?:#+\s*|\*\*)?(?:Problem Restate|Analysis Breakdown|Options Considered|Tradeoffs|Recommended Approach|Implementation Plan|Problem|Analysis):?(?:\*\*)?\s*[\s\S]*?(?=\n(?:#+\s*|\*\*)?(?:Problem Restate|Analysis Breakdown|Options Considered|Tradeoffs|Recommended Approach|Implementation Plan|Problem|Analysis):?(?:\*\*)?|$)/gim;
    processedContent = processedContent.replace(scaffoldingRegex, '');
    processedContent = processedContent.trim();
  }

  const markdownComponents = {
    h1({ children, ...props }: any) {
      return <HeadingRenderer level={1} {...props}>{children}</HeadingRenderer>;
    },
    h2({ children, ...props }: any) {
      return <HeadingRenderer level={2} {...props}>{children}</HeadingRenderer>;
    },
    h3({ children, ...props }: any) {
      return <HeadingRenderer level={3} {...props}>{children}</HeadingRenderer>;
    },
    h4({ children, ...props }: any) {
      return <HeadingRenderer level={4} {...props}>{children}</HeadingRenderer>;
    },
    p({ children, ...props }: any) {
      return <p className="mb-4 leading-relaxed text-text-primary/90" {...props}>{children}</p>;
    },
    ul({ children, ...props }: any) {
      return <ul className="mb-5 ml-5 list-disc space-y-1.5 marker:text-text-secondary" {...props}>{children}</ul>;
    },
    ol({ children, ...props }: any) {
      return <ol className="mb-5 ml-5 list-decimal space-y-1.5 marker:text-text-secondary" {...props}>{children}</ol>;
    },
    li({ children, ...props }: any) {
      return <li className="pl-1.5 leading-relaxed text-text-primary/90" {...props}>{children}</li>;
    },
    blockquote({ children, ...props }: any) {
      return (
        <blockquote className="my-5 border-l-[3px] border-[var(--accent)]/60 bg-[var(--accentMuted)] py-2.5 pl-4 pr-3 rounded-r-lg text-text-secondary italic" {...props}>
          {children}
        </blockquote>
      );
    },
    a({ children, ...props }: any) {
      return <AnchorLink {...props}>{children}</AnchorLink>;
    },
    table({ children, ...props }: any) {
      return (
        <div className="my-4 overflow-x-auto rounded-lg border border-border-color">
          <table className="min-w-full border-collapse text-sm text-text-primary" {...props}>{children}</table>
        </div>
      );
    },
    thead({ children, ...props }: any) {
      return <thead className="bg-[var(--surfaceSecondary)]" {...props}>{children}</thead>;
    },
    th({ children, ...props }: any) {
      return <th className="border-b border-border-color px-4 py-2 text-left font-semibold text-text-primary" {...props}>{children}</th>;
    },
    td({ children, ...props }: any) {
      return <td className="border-t border-border-color px-4 py-2 align-top text-text-primary" {...props}>{children}</td>;
    },
    hr({ ...props }: any) {
      return <hr className="my-6 border-0 border-t border-border-color" {...props} />;
    },
    pre({ children }: any) {
      // Prevent react-markdown from double-wrapping our CodeBlock with a default <pre>
      return <>{children}</>;
    },
    code({ className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || "");
      const hasNewline = String(children).includes('\n');
      
      // Inline code (no language specified and no newlines)
      if (!match && !hasNewline) {
        return (
          <code className="rounded-md bg-[var(--code-block-bg)] px-[0.35rem] py-[0.15rem] text-[0.9em] font-mono text-[var(--textPrimary)] font-medium whitespace-nowrap" {...props}>
            {children}
          </code>
        );
      }
      
      // File Tree detection
      if ((!match || match[1] === 'text' || match[1] === 'bash' || match[1] === 'tree' || match[1] === 'dir') && 
          (String(children).includes('├──') || String(children).includes('└──'))) {
        return <FileTree content={String(children)} />;
      }
      
      // Fenced code block
      return (
        <CodeBlock 
          language={match ? match[1] : 'text'} 
          code={String(children)} 
          isGenerating={isGenerating} 
        />
      );
    },
  };

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.2 }}
      className={`flex w-full justify-center px-4 md:px-8 py-3 sm:py-5`}
    >
      <div className="w-full max-w-[950px] mx-auto flex flex-col">
        {isUser ? (
          <div className="flex justify-end w-full group relative">
            <div className="max-w-[90%] sm:max-w-[70%] flex flex-col items-end">
              {isEditing ? (
                <div className="w-full bg-[var(--chat-bubble-user)] p-4 rounded-3xl rounded-tr-md shadow-sm min-w-[280px]">
                  <textarea
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full bg-transparent text-[var(--textPrimary)] outline-none resize-none overflow-hidden min-h-[60px] scrollbar-hide text-base leading-relaxed placeholder:text-[var(--textSecondary)]"
                    rows={Math.max(2, editValue.split('\n').length)}
                  />
                  <div className="flex justify-end gap-2 mt-3">
                    <button 
                      onClick={() => { setIsEditing(false); setEditValue(content); }} 
                      className="px-3 py-1.5 text-xs font-medium text-[var(--textPrimary)] hover:text-white transition-colors bg-black/30 rounded-full"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleEditSubmit} 
                      className="px-3 py-1.5 text-xs font-medium text-[var(--chat-bubble-user)] bg-[var(--textPrimary)] hover:opacity-90 transition-opacity rounded-full"
                    >
                      Save & Submit
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-[var(--chat-bubble-user)] text-[var(--textPrimary)] px-5 py-3 rounded-3xl text-base whitespace-pre-wrap shadow-sm rounded-tr-md">
                  {images && images.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {images.map((img, i) => (
                        <img key={i} src={img} alt={`user-upload-${i}`} className="max-w-full sm:max-w-[250px] max-h-[250px] object-cover rounded-xl" />
                      ))}
                    </div>
                  )}
                  {content}
                </div>
              )}
              
              {!isEditing && !isGenerating && (
                <div className="flex items-center gap-1 mt-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-150">
                  <Tooltip content="Copy">
                    <button onClick={handleCopy} className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-[var(--surfaceSecondary)] rounded-md transition-colors">
                      {isCopied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </Tooltip>
                  {onEdit && (
                    <Tooltip content="Edit">
                      <button onClick={() => setIsEditing(true)} className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-[var(--surfaceSecondary)] rounded-md transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </Tooltip>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col group w-full text-text-primary text-base leading-relaxed">
            <div id={`markdown-body-${id}`} className="markdown-body w-full">
              <style>{`
                .katex-display {
                  margin: 1.5em 0;
                  overflow-x: auto;
                  overflow-y: hidden;
                  padding-bottom: 0.5em;
                }
                .katex {
                  font-size: 1.05em;
                }
              `}</style>
              

              
              {isSearchingWeb && isGenerating && (
                <div className="flex items-center gap-2 mb-3 text-text-secondary text-sm font-medium">
                  <Globe className="w-4 h-4 animate-pulse text-blue-500" />
                  <span className="animate-pulse">Searching the web...</span>
                </div>
              )}

              {(reasoning || (reasoningSteps && reasoningSteps.length > 0)) && (
                <ReasoningPanel reasoning={reasoning} steps={reasoningSteps} />
              )}


              
              <AnimatePresence mode="wait">
                {isGenerating && !processedContent ? (
                  <motion.div
                    key="loader"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <TypingLoader />
                  </motion.div>
                ) : processedContent ? (
                  <motion.div
                    key="content"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Markdown 
                      remarkPlugins={[remarkGfm, remarkMath]} 
                      rehypePlugins={[rehypeKatex]}
                      components={markdownComponents}
                    >
                      {processedContent}
                    </Markdown>
                  </motion.div>
                ) : null}
              </AnimatePresence>



              {mode === 'research' && role === 'model' && content && (
                <ReportExport 
                  content={content} 
                  title={research?.title}
                  sources={sources} 
                  isGenerating={isGenerating} 
                />
              )}

              <SourceList sources={sources} isGenerating={isGenerating} />
            </div>

            {!isGenerating && content && (
              <div className="flex items-center gap-2 mt-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-150">
                <Tooltip content="Copy">
                  <button
                    onClick={handleCopy}
                    className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-[var(--surfaceSecondary)] rounded-md transition-colors flex items-center gap-1.5"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="text-xs text-green-600 font-medium">Copied!</span>
                      </>
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </Tooltip>
                <Tooltip content={isPlayingTTS ? "Stop reading" : "Read aloud"}>
                  <button
                    onClick={toggleTTS}
                    className={`p-1.5 rounded-md transition-colors flex items-center ${isPlayingTTS ? 'text-[var(--accent)] bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20' : 'text-text-secondary hover:text-text-primary hover:bg-[var(--surfaceSecondary)]'}`}
                  >
                    {isPlayingTTS ? <Square className="w-4 h-4 fill-current" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </Tooltip>
                <Tooltip content="Good response">
                  <button
                    className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-[var(--surfaceSecondary)] rounded-md transition-colors flex items-center"
                  >
                    <ThumbsUp className="w-4 h-4" />
                  </button>
                </Tooltip>
                <Tooltip content="Bad response">
                  <button
                    className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-[var(--surfaceSecondary)] rounded-md transition-colors flex items-center"
                  >
                    <ThumbsDown className="w-4 h-4" />
                  </button>
                </Tooltip>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};
