import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings as SettingsIcon, X, User, Palette, Brain, Lock, Database, Sliders, HelpCircle } from 'lucide-react';
import { useSettingsStore, SettingsState } from '../store/settings';
import { GeneralSettings } from '../settings/GeneralSettings';
import { HelpCentreSettings } from '../settings/HelpCentreSettings';
import { AISettings } from '../settings/AISettings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TABS = [
  { id: 'general', label: 'General', icon: SettingsIcon },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'ai', label: 'AI Models', icon: Brain },
  { id: 'personalization', label: 'Personalization', icon: Sliders },

  { id: 'privacy', label: 'Privacy', icon: Lock },
  { id: 'help', label: 'Help Centre', icon: HelpCircle },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const settings = useSettingsStore();

  React.useEffect(() => {
    const handleSwitchTab = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && typeof customEvent.detail === 'string') {
        setActiveTab(customEvent.detail);
      }
    };
    window.addEventListener('switch-settings-tab', handleSwitchTab);
    return () => window.removeEventListener('switch-settings-tab', handleSwitchTab);
  }, []);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/20 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-5xl h-[85vh] sm:h-[80vh] flex flex-col sm:flex-row bg-bg-primary border border-border-color rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden z-10 m-4"
        >
          {/* Header (Mobile) */}
          <div className="sm:hidden flex items-center justify-between p-4 border-b border-border-color bg-bg-primary z-20">
            <div className="flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-text-secondary" />
              <h2 className="font-semibold text-text-primary">Settings</h2>
            </div>
            <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-[var(--surfaceSecondary)] transition-colors">
              <X className="w-5 h-5 text-text-secondary" />
            </button>
          </div>

          {/* Sidebar */}
          <div className="sm:w-64 sm:flex-shrink-0 bg-bg-primary sm:border-r border-border-color flex sm:flex-col overflow-x-auto sm:overflow-y-auto scrollbar-hide border-b sm:border-b-0">
            <div className="hidden sm:flex items-center justify-between p-6 pb-4">
              <h2 className="text-xl font-serif font-medium text-text-primary">Settings</h2>
            </div>
            <div className="flex sm:flex-col gap-1 p-3 sm:p-4 min-w-max sm:min-w-0">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-3 px-4 sm:px-3 py-2.5 sm:py-2.5 rounded-lg text-sm sm:text-[15px] font-medium transition-all relative ${isActive ? 'text-text-primary bg-[var(--surfaceSecondary)]' : 'text-text-secondary hover:bg-[var(--surfaceSecondary)] hover:text-text-primary'
                      }`}
                  >
                    <Icon className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 relative flex flex-col min-w-0 bg-bg-primary">
            <div className="hidden sm:flex absolute top-4 right-4 z-20">
              <button onClick={onClose} className="p-2 rounded-full hover:bg-[var(--surfaceSecondary)] transition-colors">
                <X className="w-5 h-5 text-text-secondary" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-8">
              <div className={`${activeTab === 'help' ? 'max-w-4xl' : 'max-w-2xl'} mx-auto pb-12 transition-all duration-300`}>
                {activeTab === 'general' && (
                  <GeneralSettings />
                )}
                {activeTab === 'profile' && (
                  <ProfileSettings settings={settings} />
                )}
                {activeTab === 'personalization' && (
                  <PersonalizationSettings settings={settings} />
                )}

                {activeTab === 'ai' && (
                  <AISettings settings={settings} />
                )}

                {activeTab === 'privacy' && (
                  <PrivacySettings settings={settings} />
                )}

                {activeTab === 'help' && (
                  <HelpCentreSettings />
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

/* --- Setting Sections --- */

const SectionTitle = ({ title, description }: { title: string; description?: string }) => (
  <div className="mb-6">
    <h3 className="text-xl font-medium text-text-primary mb-1">{title}</h3>
    {description && <p className="text-sm text-text-secondary">{description}</p>}
  </div>
);

const FormDivider = () => <div className="h-px bg-border-color my-6" />;

const ProfileSettings = ({ settings }: { settings: SettingsState }) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
    <SectionTitle title="User Profile" description="Manage your public identity." />

    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">Display Name</label>
        <input
          type="text"
          value={settings.profile.displayName}
          onChange={(e) => settings.updateProfile({ displayName: e.target.value })}
          className="w-full bg-bg-input border border-border-color rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-text-secondary transition-all font-medium placeholder:text-text-secondary"
          placeholder="e.g. John Doe"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">Bio</label>
        <textarea
          value={settings.profile.bio}
          onChange={(e) => settings.updateProfile({ bio: e.target.value })}
          rows={3}
          className="w-full bg-bg-input border border-border-color rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:border-text-secondary transition-all font-medium placeholder:text-text-secondary resize-none"
          placeholder="A brief bio..."
        />
      </div>
    </div>
  </motion.div>
);

const PersonalizationSettings = ({ settings }: { settings: SettingsState }) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
    <SectionTitle title="Personalization" description="Customize how MemoryBase interacts with you." />

    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">What should MemoryBase know about you?</label>
        <p className="text-xs text-text-secondary mb-2 leading-relaxed">Provide details to help MemoryBase tailor its responses (e.g. software engineer, loves brief answers, strictly typing).</p>
        <textarea
          value={settings.personalization.instructionsAbout}
          onChange={(e) => settings.updatePersonalization({ instructionsAbout: e.target.value })}
          rows={4}
          className="w-full bg-bg-input border border-border-color rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:border-text-secondary transition-all text-sm placeholder:text-text-secondary resize-none"
          placeholder="I work as a..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">How would you like MemoryBase to respond?</label>
        <textarea
          value={settings.personalization.instructionsRespond}
          onChange={(e) => settings.updatePersonalization({ instructionsRespond: e.target.value })}
          rows={4}
          className="w-full bg-bg-input border border-border-color rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:border-text-secondary transition-all text-sm placeholder:text-text-secondary resize-none"
          placeholder="Use bullet points, focus on best practices..."
        />
      </div>

    </div>
  </motion.div>
);


const PrivacySettings = ({ settings }: { settings: SettingsState }) => {
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you sure you want to permanently delete your account? This action cannot be undone and all your data will be erased.")) return;

    setIsDeleting(true);
    try {
      localStorage.clear();
      window.location.href = '/';
    } catch (err) {
      console.error(err);
      setIsDeleting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <SectionTitle title="Privacy & Security" description="Control how your data is used." />

      <div className="space-y-4">
        <ToggleRow
          label="Save Chat History"
          description="Save your conversations to this browser locally."
          checked={settings.privacy.chatHistory}
          onChange={(checked) => settings.updatePrivacy({ chatHistory: checked })}
        />
        <ToggleRow
          label="Training Data Opt-Out"
          description="Prevent your chats from being used to improve our models."
          checked={settings.privacy.trainingDataOptOut}
          onChange={(checked) => settings.updatePrivacy({ trainingDataOptOut: checked })}
        />
      </div>

      <FormDivider />

      <div className="space-y-3">
        <button className="w-full bg-[var(--surfaceSecondary)] hover:opacity-80 text-text-primary font-medium py-3 px-4 rounded-xl transition-colors text-left text-sm border border-transparent">
          Export Account Data (.zip)
        </button>
        <button
          onClick={handleDeleteAccount}
          disabled={isDeleting}
          className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 font-medium py-3 px-4 rounded-xl transition-colors text-left text-sm border border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDeleting ? "Deleting Account..." : "Delete Account"}
        </button>
      </div>
    </motion.div>
  );
};


/* --- Shared Components --- */

const ToggleRow = ({ label, description, checked, disabled = false, onChange }: { label: string; description: string; checked: boolean; disabled?: boolean; onChange: (val: boolean) => void }) => (
  <div className={`flex items-center justify-between py-1 gap-6 ${disabled ? 'opacity-50' : ''}`}>
    <div className="flex-1 min-w-0">
      <h4 className="text-[15px] font-medium text-text-primary mb-0.5">{label}</h4>
      <p className="text-xs sm:text-sm text-text-secondary leading-relaxed pr-2">{description}</p>
    </div>
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-[24px] w-[44px] flex-shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:border-text-secondary disabled:cursor-not-allowed ${checked ? 'bg-[var(--accent)]' : 'bg-[var(--surfaceSecondary)]'
        }`}
    >
      <span className={`pointer-events-none inline-block h-[18px] w-[18px] transform rounded-full bg-[var(--textPrimary)] shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0.5'
        }`} />
    </button>
  </div>
);
