import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { CodeBlock } from '../components/CodeBlock';
import { HeadingRenderer } from '../components/markdown/HeadingRenderer';
import { AnchorLink } from '../components/markdown/AnchorLink';
import { FileTree } from '../components/markdown/FileTree';
import { useShareStore } from '../store/shareStore';
import { Bot, User } from 'lucide-react';

export const SharePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const getShare = useShareStore(s => s.getShare);
  
  const [share, setShare] = useState<ReturnType<typeof getShare>>(undefined);
  
  useEffect(() => {
    if (id) {
      setShare(getShare(id));
    }
  }, [id, getShare]);

  if (!share) {
    return (
      <div className="min-h-screen bg-[var(--background)] text-text-primary flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Share not found</h1>
        <p className="text-text-secondary mb-8">This link may be invalid or has expired.</p>
        <Link to="/" className="px-4 py-2 bg-[var(--accent)] text-white rounded-full font-medium">
          Go to MemoryBase
        </Link>
      </div>
    );
  }

  const { message } = share;
  const isUser = message.role === 'user';

  return (
    <div className="min-h-screen bg-[var(--background)] text-text-primary flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[var(--background)]/80 backdrop-blur-md border-b border-[var(--border)] h-14 flex items-center px-4 md:px-8">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg hover:opacity-80 transition-opacity">
          <Bot className="w-6 h-6 text-[var(--accent)]" />
          <span>MemoryBase</span>
        </Link>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 md:py-12 flex flex-col gap-8">
        <div className={`flex gap-4 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
          <div className="flex-shrink-0 mt-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isUser ? 'bg-[var(--surfaceSecondary)]' : 'bg-[var(--accent)]/10 text-[var(--accent)]'}`}>
              {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
            </div>
          </div>
          
          <div className={`flex-1 min-w-0 ${isUser ? "text-right" : "text-left"}`}>
            <div className={`inline-block text-left ${isUser ? "bg-[var(--surfaceSecondary)] rounded-2xl px-5 py-3" : "w-full"}`}>
              <div className="prose prose-invert max-w-none break-words">
                <Markdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    code({ node, inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || '');
                      if (inline) {
                        return (
                          <code className="bg-[var(--surface)] text-[var(--accent)] px-1.5 py-0.5 rounded-md text-[13px] font-mono" {...props}>
                            {children}
                          </code>
                        );
                      }
                      if (match && match[1] === 'tree') {
                        return <FileTree content={String(children).replace(/\n$/, '')} />;
                      }
                      return match ? (
                        <CodeBlock language={match[1]} code={String(children).replace(/\n$/, '')} />
                      ) : (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    },
                    h1: HeadingRenderer,
                    h2: HeadingRenderer,
                    h3: HeadingRenderer,
                    a: AnchorLink,
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-4 rounded-xl border border-[var(--border)]">
                        <table className="w-full text-sm text-left">{children}</table>
                      </div>
                    ),
                    thead: ({ children }) => <thead className="text-xs uppercase bg-[var(--surfaceSecondary)]">{children}</thead>,
                    th: ({ children }) => <th className="px-4 py-3 font-medium">{children}</th>,
                    td: ({ children }) => <td className="px-4 py-3 border-t border-[var(--border)]">{children}</td>,
                  }}
                >
                  {message.content}
                </Markdown>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-8 px-4 flex flex-col items-center justify-center gap-4 bg-[var(--surface)]">
        <p className="text-text-secondary text-sm">Shared via MemoryBase</p>
        <Link to="/" className="px-6 py-2.5 bg-[var(--accent)] text-white rounded-full font-medium hover:opacity-90 transition-opacity">
          Open in MemoryBase
        </Link>
      </footer>
    </div>
  );
};
