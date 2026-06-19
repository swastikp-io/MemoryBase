import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ReasoningStep } from "../../store/reasoningStore";
import { Check, Circle, Loader2, XCircle, ChevronRight, ChevronDown } from "lucide-react";
import { ReasoningPhase } from "../../store/chatStore";
import { formatDuration } from "../../lib/formatDuration";

interface ReasoningPanelProps {
  steps?: ReasoningStep[];
  reasoning?: ReasoningPhase; // legacy fallback
}

export const ReasoningPanel: React.FC<ReasoningPanelProps> = ({ steps = [], reasoning }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  
  // Calculate if it's completely done
  const hasSteps = steps.length > 0;
  const isFinished = hasSteps 
    ? steps.every(s => s.status === 'completed' || s.status === 'error')
    : reasoning?.isComplete;

  const firstStep = hasSteps ? steps.reduce((min, s) => s.startedAt < min.startedAt ? s : min) : null;
  const lastStep = hasSteps ? steps.reduce((max, s) => (s.completedAt || s.startedAt) > (max.completedAt || max.startedAt) ? s : max) : null;

  // Auto-collapse after 2 seconds when finished
  useEffect(() => {
    if (!isFinished) {
      setIsExpanded(true);
    } else {
      const timer = setTimeout(() => setIsExpanded(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isFinished]);

  // Update current time for live duration tracking
  useEffect(() => {
    if (!isFinished && hasSteps) {
      const interval = setInterval(() => setCurrentTime(Date.now()), 100);
      return () => clearInterval(interval);
    }
  }, [isFinished, hasSteps]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <Check className="w-4 h-4 text-green-500" />;
      case 'active': return <Loader2 className="w-4 h-4 text-text-secondary animate-spin" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending': 
      default: return <Circle className="w-4 h-4 text-text-secondary opacity-50" />;
    }
  };

  const calculateTotalDuration = () => {
    if (!firstStep) return 0;
    const start = firstStep.startedAt;
    const end = isFinished && lastStep?.completedAt ? lastStep.completedAt : currentTime;
    return Math.max(0, end - start);
  };

  const getStepDuration = (step: ReasoningStep) => {
    if (step.durationMs !== undefined) return step.durationMs;
    if (step.status === 'active') return Math.max(0, currentTime - step.startedAt);
    return 0;
  };

  if (!hasSteps && !reasoning) return null;

  const totalDurationMs = calculateTotalDuration();
  const titleText = !isFinished ? "Thinking..." : `Thought for ${formatDuration(totalDurationMs).replace('s', ' seconds').replace('m', ' minute')}`;

  return (
    <div className="flex flex-col mb-4 w-full">
      <div 
        className="flex items-center gap-2 cursor-pointer w-fit text-text-secondary hover:text-text-primary transition-colors select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-center w-5 h-5 bg-[var(--surfaceSecondary)] rounded-full border border-[var(--border)]">
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </div>
        <span className="text-[13px] font-medium">
          {titleText}
        </span>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="mt-3 ml-[9px] pl-6 border-l-[2px] border-[var(--border)] py-1 space-y-4">
              {hasSteps ? (
                steps.map(step => (
                  <motion.div 
                    key={step.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex flex-col gap-1 relative"
                  >
                    <div className="absolute -left-[33px] top-0.5 w-[20px] h-[20px] flex items-center justify-center bg-[var(--background)]">
                      {getStatusIcon(step.status)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[14px] ${step.status === 'active' ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>
                        {step.title}
                      </span>
                      {(step.status === 'completed' || step.status === 'active') && (
                        <span className="text-[12px] text-text-secondary/60">
                          ({formatDuration(getStepDuration(step))})
                        </span>
                      )}
                    </div>
                    {step.description && (
                      <div className="text-[13px] text-text-secondary">
                        {step.description}
                      </div>
                    )}
                  </motion.div>
                ))
              ) : (
                <div className="flex items-center gap-3 relative">
                  <div className="absolute -left-[33px] top-0.5 w-[20px] h-[20px] flex items-center justify-center bg-[var(--background)]">
                    {reasoning?.isComplete ? <Check className="w-4 h-4 text-green-500" /> : <Loader2 className="w-4 h-4 text-text-secondary animate-spin" />}
                  </div>
                  <span className="text-[14px] text-text-primary">{reasoning?.step || reasoning?.status}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
