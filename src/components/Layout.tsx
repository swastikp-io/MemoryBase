import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Sidebar } from "./Sidebar";
import { SettingsModal } from "./SettingsModal";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [ttsError, setTtsError] = useState<string | null>(null);

  useEffect(() => {
    const handleOpenSettings = () => setIsSettingsOpen(true);
    const handleCloseSettings = () => setIsSettingsOpen(false);
    const handleTtsError = (e: any) => {
      setTtsError(`TTS Error: ${e.detail?.message} - ${e.detail?.error}`);
      setTimeout(() => setTtsError(null), 5000);
    };
    window.addEventListener('open-settings', handleOpenSettings);
    window.addEventListener('close-settings', handleCloseSettings);
    window.addEventListener('tts-error', handleTtsError);
    return () => {
      window.removeEventListener('open-settings', handleOpenSettings);
      window.removeEventListener('close-settings', handleCloseSettings);
      window.removeEventListener('tts-error', handleTtsError);
    };
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, filter: "blur(10px)", scale: 0.95 }}
      animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="flex h-screen w-full overflow-hidden font-sans selection:bg-[#10A37F] selection:text-[#ffffff] relative bg-bg-primary text-text-primary"
    >
      <div className="flex h-full w-full">
        <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} onOpenSettings={() => setIsSettingsOpen(true)} />
        <div 
          className="relative flex min-h-0 min-w-0 flex-1 flex-col transition-all duration-300"
          style={{ '--model-picker-left': sidebarOpen ? '1.5rem' : '3.5rem' } as React.CSSProperties}
        >
          {ttsError && (
            <div className="absolute top-0 left-0 right-0 z-50 bg-red-600 text-white p-3 text-center text-sm shadow-md animate-fade-in">
              {ttsError}
            </div>
          )}
          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-bg-primary">
            {children}
          </div>
        </div>
      </div>
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </motion.div>
  );
};
