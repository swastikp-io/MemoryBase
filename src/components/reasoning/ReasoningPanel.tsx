import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ReasoningPhase } from '../../context/ChatContext';
import { ThinkingAnimation } from './ThinkingAnimation';

interface ReasoningPanelProps {
  reasoning: ReasoningPhase;
}

export const ReasoningPanel: React.FC<ReasoningPanelProps> = ({ reasoning }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasStartedAnswering, setHasStartedAnswering] = useState(false);

  // Auto-collapse when reasoning is complete
  useEffect(() => {
    if (reasoning.isComplete && !hasStartedAnswering) {
      setIsExpanded(false);
      setHasStartedAnswering(true);
    } else if (!reasoning.isComplete && !hasStartedAnswering) {
      setIsExpanded(true); // Open while thinking
    }
  }, [reasoning.isComplete, hasStartedAnswering]);

  // Clean formatting for the plan
  const formattedPlan = reasoning.plan 
    ? reasoning.plan.split('\n').filter(line => line.trim().length > 0 && !line.toLowerCase().includes('plan:'))
        .map(line => line.replace(/^\d+\.\s*/, '• '))
    : [];

  return (
    <div className="flex flex-col mb-4 max-w-[800px] w-full mx-auto">
      <div className="flex items-center gap-3">
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-[12px] font-medium text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1.5"
        >
          {reasoning.isComplete ? 'View reasoning' : (
            <span className="flex items-center">
              {reasoning.status}
              <ThinkingAnimation />
            </span>
          )}
        </button>
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
            <div className="mt-3 p-4 rounded-xl bg-[var(--surfaceSecondary)] border border-[var(--border)]">
              <AnimatePresence>
                {reasoning.step && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="mb-4 last:mb-0"
                  >
                    <div className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
                      CURRENT PHASE
                    </div>
                    <div className="text-[14px] text-text-primary">
                      {reasoning.step}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {formattedPlan.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="mt-4 border-t border-[var(--border)] pt-4"
                  >
                    <div className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-3">
                      PLAN
                    </div>
                    <div className="space-y-2">
                      {formattedPlan.map((item, idx) => (
                        <div key={idx} className="text-[14px] text-text-primary pl-1">
                          {item}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
