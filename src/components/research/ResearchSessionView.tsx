import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, CheckCircle2, Circle, XCircle, Loader2, ChevronDown, ChevronRight, Check } from 'lucide-react';
import { ResearchSession, ResearchStatus, ResearchStep } from "../../store/chatStore";

interface ResearchSessionViewProps {
  session: ResearchSession;
  isGenerating?: boolean;
  onCancel?: () => void;
}

const stripMarkdown = (text: string) => {
  if (!text) return "";
  return text
    .replace(/\*\*/g, "")
    .replace(/__/g, "")
    .replace(/`/g, "")
    .replace(/^#+\s*/, "")
    .trim();
};

export const ResearchSessionView: React.FC<ResearchSessionViewProps> = ({ session, isGenerating, onCancel }) => {
  const isCompleted = session.status === 'completed';
  const isCancelled = session.status === 'cancelled';
  const isFailed = session.status === 'failed';
  const isActive = session.status === 'planning' || session.status === 'running';

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hasAutoCollapsed, setHasAutoCollapsed] = useState(false);

  useEffect(() => {
    if (isCompleted && !isGenerating && !hasAutoCollapsed) {
      const timer = setTimeout(() => {
        setIsCollapsed(true);
        setHasAutoCollapsed(true);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isCompleted, isGenerating, hasAutoCollapsed]);  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-6 flex flex-col w-full bg-[var(--surfaceSecondary)] rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm"
    >
      <AnimatePresence mode="wait">
        {isCollapsed ? (
          <motion.button 
            key="collapsed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCollapsed(false)}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--surface)] transition-colors text-left group"
          >
            <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <Check className="w-3.5 h-3.5 text-green-500" />
            </div>
            <div className="flex-1 font-medium text-text-primary text-[14px]">
              Research Complete <span className="text-text-secondary font-normal ml-1">({session.steps?.length || 0} steps)</span>
            </div>
            <ChevronRight className="w-4 h-4 text-text-secondary group-hover:text-text-primary transition-colors" />
          </motion.button>
        ) : (
          <motion.div
            key="expanded"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col w-full"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-[var(--surfaceSecondary)]/90 backdrop-blur-md border-b border-[var(--border)] px-5 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text-primary truncate flex items-center gap-2">
                {isCompleted && !isGenerating && (
                  <button 
                    onClick={() => setIsCollapsed(true)} 
                    className="p-1 -ml-1 rounded-md hover:bg-[var(--surface)] text-text-secondary transition-colors"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                )}
                {session.title || "Deep Research"}
              </h3>
              {isActive && (
                <button className="p-2 rounded-full hover:bg-[var(--surface)] text-text-secondary hover:text-text-primary transition-colors">
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Main Content Area */}
            <div className="flex flex-col p-5">
              
              {/* Steps Column */}
              <div className="w-full flex flex-col gap-3">
                <h4 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-1">Research Plan</h4>
                <div className="flex flex-col gap-3">
                  {session.steps && session.steps.length > 0 ? (
                    session.steps.map((step) => (
                      <div key={step.id} className="flex items-start gap-3">
                        <div className="mt-0.5 flex-shrink-0">
                          {step.status === 'completed' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                          {step.status === 'running' && <Loader2 className="w-5 h-5 text-[var(--accent)] animate-spin" />}
                          {step.status === 'pending' && <Circle className="w-5 h-5 text-text-secondary opacity-50" />}
                          {step.status === 'failed' && <XCircle className="w-5 h-5 text-red-500" />}
                        </div>
                        <span className={`text-[15px] leading-relaxed ${step.status === 'completed' ? 'text-text-primary' : step.status === 'running' ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>
                          <strong>{stripMarkdown(step.title)}</strong>
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 text-[var(--accent)] animate-spin" />
                      <span className="text-[15px] text-text-secondary">Generating plan...</span>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Footer / Controls */}
            {(!isCompleted || isActive) && (
              <div className="px-5 py-4 border-t border-[var(--border)] bg-[var(--surface)] flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Overall Progress</span>
                    <span className="text-xs font-medium text-[var(--accent)]">{Math.round(session.progress)}%</span>
                  </div>
                  <div className="w-full bg-[var(--surfaceSecondary)] rounded-full h-2 overflow-hidden border border-[var(--border)]">
                    <motion.div 
                      className="bg-[var(--accent)] h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${session.progress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>

                {isActive && (
                  <button 
                    onClick={() => {
                      if (window.confirm("Cancel this research session?")) {
                        onCancel?.();
                      }
                    }}
                    className="px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors rounded-lg text-sm font-medium whitespace-nowrap"
                  >
                    Cancel Research
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
