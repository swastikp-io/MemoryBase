import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Rocket, Key, Mail, Youtube, Lightbulb, 
  ShieldCheck, Terminal, Settings as SettingsIcon, 
  Palette, Play, Plus, Search, HelpCircle,
  MessageSquare
} from 'lucide-react';

export const HelpCentreSettings: React.FC = () => {
  const [activeSection, setActiveSection] = useState('getting-started');
  
  const navItems = [
    { id: 'getting-started', label: 'Getting Started', icon: Rocket },
    { id: 'api-setup', label: 'API Setup', icon: Key },
    { id: 'tips', label: 'Tips & Tricks', icon: Lightbulb },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-border-color pb-6">
        <h2 className="text-2xl sm:text-3xl font-semibold text-text-primary flex items-center gap-3">
          <HelpCircle className="w-8 h-8 text-[var(--accent-primary)]" />
          Paralex Help Centre
        </h2>
        <p className="text-text-secondary text-[15px] max-w-2xl leading-relaxed">
          Paralex is an AI-native workspace that combines powerful AI models, web search, research capabilities, and productivity tools into a single experience.
        </p>
      </div>

      {/* Navigation Pills */}
      <div className="flex flex-wrap gap-2 sticky top-0 bg-bg-primary/95 backdrop-blur-md z-10 py-3 -mx-2 px-2 border-b border-border-color/50">
         {navItems.map(item => {
           const Icon = item.icon;
           const isActive = activeSection === item.id;
           return (
             <button
               key={item.id}
               onClick={() => {
                 setActiveSection(item.id);
                 document.getElementById(`section-${item.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
               }}
               className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                 isActive 
                   ? 'bg-[var(--accent-primary)] text-[var(--accent-fg)] shadow-md shadow-[var(--accent-primary)]/20' 
                   : 'bg-black/5 dark:bg-white/5 text-text-secondary hover:text-text-primary hover:bg-black/10 dark:hover:bg-white/10'
               }`}
             >
               <Icon className="w-4 h-4" />
               {item.label}
             </button>
           );
         })}
      </div>

      {/* Content */}
      <div className="space-y-12 pb-12">
        {/* Getting Started & API Setup */}
        <Section id="getting-started" title="Quick Setup" icon={Key}>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* Stepper */}
             <Card>
                <h3 className="text-lg font-medium text-text-primary mb-5 flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-[var(--accent-primary)]" />
                  Connect OpenRouter
                </h3>
                <div className="space-y-5">
                  <Step number={1} title="Create OpenRouter Account">
                    Visit <a href="https://openrouter.ai" target="_blank" rel="noreferrer" className="text-[var(--accent-primary)] hover:underline font-medium">openrouter.ai</a> and sign up.
                  </Step>
                  <Step number={2} title="Generate API Key">
                    Navigate to the <strong>Keys</strong> section and click <strong>Create API Key</strong>. Name it "Paralex" and copy the key.
                  </Step>
                  <Step number={3} title="Add to Paralex">
                    Open Paralex <strong>Settings</strong> &gt; <strong>AI Model & API Key</strong> and paste your key.
                  </Step>
                  <Step number={4} title="Save Settings">
                    Your key is securely saved locally.
                  </Step>
                </div>
             </Card>

             <div className="space-y-6">
               <CalloutBox type="info" icon={ShieldCheck} title="Privacy Notice">
                 <p className="text-[13px] text-text-secondary mt-1.5 leading-relaxed">
                   Paralex never stores or records your API keys. All keys remain securely encrypted on your device and are fully under your control.
                 </p>
               </CalloutBox>
              </div>
           </div>
        </Section>



        {/* Tips & Troubleshooting */}
        <Section id="tips" title="Tips for Best Results" icon={Lightbulb}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <ul className="space-y-4">
                <ListItem text="Keep your OpenRouter API key secure." />
              </ul>
            </Card>
            
            <CalloutBox type="warning" title="Need Help?">
              <ul className="space-y-3 text-[13px] text-orange-600/80 dark:text-orange-200/80 mt-3 font-medium">
                <li>1. Verify that your OpenRouter API key is valid.</li>
                <li>2. Ensure the API key is correctly saved in Settings.</li>
                <li>3. Check your internet connection.</li>
                <li>4. Restart Paralex and try again.</li>
              </ul>
            </CalloutBox>
          </div>
        </Section>

      </div>
    </motion.div>
  );
};

// Subcomponents

const Section = ({ id, title, icon: Icon, children }: any) => (
  <div id={`section-${id}`} className="scroll-mt-32">
    <div className="flex items-center gap-3 mb-6">
      <div className="p-2.5 rounded-xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
        <Icon className="w-5 h-5" />
      </div>
      <h2 className="text-xl sm:text-2xl font-semibold text-text-primary tracking-tight">{title}</h2>
    </div>
    {children}
  </div>
);

const Card = ({ children, className = '' }: any) => (
  <div className={`bg-bg-input/60 rounded-2xl border border-border-color p-6 shadow-sm hover:shadow-md transition-shadow duration-300 ${className}`}>
    {children}
  </div>
);

const Step = ({ number, title, children }: any) => (
  <div className="flex gap-4">
    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] flex items-center justify-center font-bold text-sm border border-[var(--accent-primary)]/20 mt-0.5">
      {number}
    </div>
    <div>
      <h4 className="font-semibold text-text-primary text-[14px]">{title}</h4>
      <p className="text-text-secondary text-[13px] mt-1 leading-relaxed">{children}</p>
    </div>
  </div>
);

const CalloutBox = ({ type = 'info', icon: Icon, title, children }: any) => {
  const styles = {
    info: 'bg-blue-500/10 border-blue-500/20 text-blue-500',
    warning: 'bg-orange-500/10 border-orange-500/20 text-orange-500',
    success: 'bg-green-500/10 border-green-500/20 text-green-500'
  }[type as 'info' | 'warning' | 'success'];
  
  const [bg, border, text] = styles.split(' ');

  return (
    <div className={`rounded-2xl border p-5 ${bg} ${border}`}>
      <div className="flex items-center gap-2.5 mb-1.5">
        {Icon && <Icon className={`w-5 h-5 ${text}`} />}
        <h4 className={`font-semibold text-sm ${text}`}>{title}</h4>
      </div>
      {children}
    </div>
  );
};

const CommandCard = ({ command, description, icon: Icon, color, iconBg, className = '' }: any) => (
  <div className={`bg-bg-primary border border-border-color rounded-xl p-4 sm:p-5 hover:border-[var(--accent-primary)]/40 transition-all duration-300 shadow-sm hover:shadow-md group ${className}`}>
    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
      {Icon && (
        <div className={`p-2.5 rounded-xl ${iconBg || 'bg-black/5 dark:bg-white/5'} ${color || 'text-text-secondary'} shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
          <Icon className="w-5 h-5" />
        </div>
      )}
      <div>
        <div className="font-mono text-[12px] sm:text-[13px] text-[var(--accent-primary)] bg-[var(--accent-primary)]/10 px-2.5 py-1.5 rounded-lg inline-block mb-2 font-semibold">
          "{command}"
        </div>
        <p className="text-text-secondary text-[13px] sm:text-[14px] leading-relaxed font-medium">{description}</p>
      </div>
    </div>
  </div>
);

const Shortcut = ({ label, keys }: any) => (
  <div className="flex items-center justify-between py-2.5 border-b border-border-color/50 last:border-0 last:pb-0">
    <span className="text-[13px] font-medium text-text-secondary">{label}</span>
    <div className="flex items-center gap-1.5">
      {keys.map((k: string, i: number) => (
        <kbd key={i} className="px-2 py-1 bg-bg-primary border border-border-color rounded-md text-[11px] font-mono text-text-primary shadow-sm font-semibold">
          {k}
        </kbd>
      ))}
    </div>
  </div>
);

const ListItem = ({ text }: any) => (
  <li className="flex items-start gap-3 text-[14px] text-text-secondary font-medium">
    <div className="mt-2 w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] flex-shrink-0 opacity-80" />
    <span className="leading-relaxed">{text}</span>
  </li>
);
