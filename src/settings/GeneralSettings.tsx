import React from 'react';
import { motion } from 'motion/react';
import { ThemeSelector } from '../components/ThemeSelector';

const SectionTitle = ({ title, description }: { title: string; description?: string }) => (
  <div className="mb-6">
    <h3 className="text-xl font-medium text-text-primary mb-1">{title}</h3>
    {description && <p className="text-sm text-text-secondary">{description}</p>}
  </div>
);

export const GeneralSettings: React.FC = () => {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <SectionTitle title="Appearance" description="Customize the application theme and colors." />
      
      <div className="space-y-4">
        <ThemeSelector />
      </div>
    </motion.div>
  );
};
