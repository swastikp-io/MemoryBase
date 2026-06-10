import React from 'react';
import { Message } from '../context/ChatContext';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Terminal, CheckCircle2, Code2, Layout, Loader2, FileCode, Target } from 'lucide-react';

interface CodingWorkspaceProps {
  messages: Message[];
  isStreaming: boolean;
}

export const CodingWorkspace: React.FC<CodingWorkspaceProps> = ({ messages, isStreaming }) => {
  const latestUserMessage = [...messages].reverse().find(m => m.role === 'user');
  const latestModelMessage = [...messages].reverse().find(m => m.role === 'model');

  // Extract sections from the markdown content
  const extractSection = (content: string, sectionName: string) => {
    const regex = new RegExp(`##\\s+${sectionName}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`, 'i');
    const match = content.match(regex);
    return match ? match[1].trim() : null;
  };

  const modelContent = latestModelMessage?.content || '';
  
  const goal = extractSection(modelContent, 'Goal');
  const activePlan = extractSection(modelContent, 'Active Plan');
  const currentTask = extractSection(modelContent, 'Current Task');
  const filesModified = extractSection(modelContent, 'Files Being Modified');
  const executionLogs = extractSection(modelContent, 'Execution Logs');
  const generatedOutput = extractSection(modelContent, 'Generated Output');

  const showWorkspace = messages.length > 0 && latestUserMessage;

  if (!showWorkspace) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-text-secondary h-full">
        <Code2 className="w-16 h-16 mb-6 opacity-20" />
        <h2 className="text-2xl font-mono text-text-primary mb-2">Paralex Coding Agent</h2>
        <p className="font-mono text-sm max-w-md text-center">Ready to scaffold, architect, and implement production-ready software.</p>
      </div>
    );
  }

  const renderMarkdown = (content: string | null, placeholder: string) => {
    if (!content) return <span className="opacity-50">{placeholder}</span>;
    return (
      <div className="prose prose-invert prose-sm max-w-none">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={{
            code({node, inline, className, children, ...props}: any) {
              const match = /language-(\w+)/.exec(className || '');
              return !inline && match ? (
                <SyntaxHighlighter
                  style={vscDarkPlus as any}
                  language={match[1]}
                  PreTag="div"
                  className="rounded-md !mt-0 text-[12px]"
                  {...props}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              ) : (
                <code className={className} {...props}>
                  {children}
                </code>
              )
            }
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0a0a] overflow-y-auto font-mono text-[13px] scrollbar-thin scrollbar-thumb-border-color pb-32">
      <div className="w-full max-w-[1200px] mx-auto p-4 md:p-8 flex flex-col gap-4">
        
        {/* Goal */}
        <div className="border border-[#333] rounded-md bg-[#111] overflow-hidden">
          <div className="bg-[#1a1a1a] px-4 py-2 border-b border-[#333] flex items-center gap-2">
            <Target className="w-4 h-4 text-text-secondary" />
            <span className="text-text-primary font-medium uppercase text-xs tracking-wider">Goal</span>
            {isStreaming && !goal && <Loader2 className="w-3 h-3 text-text-secondary animate-spin ml-auto" />}
          </div>
          <div className="p-4 text-text-secondary">
            {renderMarkdown(goal, latestUserMessage?.content || "Analyzing request...")}
          </div>
        </div>

        {/* Plan & Task Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-[#333] rounded-md bg-[#111] overflow-hidden">
            <div className="bg-[#1a1a1a] px-4 py-2 border-b border-[#333] flex items-center gap-2">
              <Layout className="w-4 h-4 text-text-secondary" />
              <span className="text-text-primary font-medium uppercase text-xs tracking-wider">Active Plan</span>
            </div>
            <div className="p-4 text-text-secondary h-[200px] overflow-y-auto scrollbar-thin">
              {renderMarkdown(activePlan, "Pending task decomposition...")}
            </div>
          </div>

          <div className="border border-[#333] rounded-md bg-[#111] overflow-hidden">
            <div className="bg-[#1a1a1a] px-4 py-2 border-b border-[#333] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-text-secondary" />
              <span className="text-text-primary font-medium uppercase text-xs tracking-wider">Current Task</span>
            </div>
            <div className="p-4 text-text-secondary h-[200px] overflow-y-auto scrollbar-thin">
              {renderMarkdown(currentTask, "Waiting for task assignment...")}
            </div>
          </div>
        </div>

        {/* Files Modified & Execution Logs Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-[#333] rounded-md bg-[#111] overflow-hidden">
            <div className="bg-[#1a1a1a] px-4 py-2 border-b border-[#333] flex items-center gap-2">
              <FileCode className="w-4 h-4 text-text-secondary" />
              <span className="text-text-primary font-medium uppercase text-xs tracking-wider">Files Being Modified</span>
            </div>
            <div className="p-4 text-text-secondary h-[150px] overflow-y-auto scrollbar-thin">
              {renderMarkdown(filesModified, "No files identified yet...")}
            </div>
          </div>

          <div className="border border-[#333] rounded-md bg-[#111] overflow-hidden">
            <div className="bg-[#1a1a1a] px-4 py-2 border-b border-[#333] flex items-center gap-2">
              <Terminal className="w-4 h-4 text-text-secondary" />
              <span className="text-text-primary font-medium uppercase text-xs tracking-wider">Execution Logs</span>
            </div>
            <div className="p-4 text-[#a3a3a3] h-[150px] overflow-y-auto whitespace-pre-wrap font-mono text-[12px] scrollbar-thin bg-black">
              {latestModelMessage?.reasoning?.status && (
                <div className="text-[var(--accent)] mb-2">[{new Date().toISOString().split('T')[1].slice(0,8)}] System: {latestModelMessage.reasoning.status}</div>
              )}
              {executionLogs ? executionLogs : '> Initialization complete. Waiting for agent workflow...'}
            </div>
          </div>
        </div>

        {/* Generated Output */}
        <div className="border border-[#333] rounded-md bg-[#111] overflow-hidden flex-1 min-h-[300px] flex flex-col">
          <div className="bg-[#1a1a1a] px-4 py-2 border-b border-[#333] flex items-center gap-2">
            <Code2 className="w-4 h-4 text-text-secondary" />
            <span className="text-text-primary font-medium uppercase text-xs tracking-wider">Generated Output</span>
            {isStreaming && <Loader2 className="w-3 h-3 text-[var(--accent)] animate-spin ml-auto" />}
          </div>
          <div className="p-4 text-text-secondary flex-1 overflow-y-auto scrollbar-thin">
            {renderMarkdown(generatedOutput, "Awaiting implementation phase...")}
          </div>
        </div>

      </div>
    </div>
  );
};
