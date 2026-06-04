import React from 'react';
import { motion } from 'motion/react';
import { AccentColorSelector } from '../components/AccentColorSelector';

const SectionTitle = ({ title, description }: { title: string; description?: string }) => (
  <div className="mb-6">
    <h3 className="text-xl font-medium text-text-primary mb-1">{title}</h3>
    {description && <p className="text-sm text-text-secondary">{description}</p>}
  </div>
);

export const GeneralSettings: React.FC = () => {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <SectionTitle title="General" description="General application settings." />
      
      <div className="space-y-4">
        <div className="flex items-center justify-between py-1 gap-6">
          <div className="flex-1 min-w-0">
            <h4 className="text-[15px] font-medium text-text-primary mb-0.5">Accent Color</h4>
            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed pr-2">Choose an accent color for the Paralex UI.</p>
          </div>
          <AccentColorSelector />
        </div>
      </div>
    </motion.div>
  );
};
