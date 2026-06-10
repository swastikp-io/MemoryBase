import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Sidebar } from "./Sidebar";
import { SettingsModal } from "./SettingsModal";
import { ChatSearchModal } from "./search/ChatSearchModal";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    const handleOpenSettings = () => setIsSettingsOpen(true);
    const handleCloseSettings = () => setIsSettingsOpen(false);
    window.addEventListener('open-settings', handleOpenSettings);
    window.addEventListener('close-settings', handleCloseSettings);
    return () => {
      window.removeEventListener('open-settings', handleOpenSettings);
      window.removeEventListener('close-settings', handleCloseSettings);
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
          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-bg-primary">
            {children}
          </div>
        </div>
      </div>
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <ChatSearchModal />
    </motion.div>
  );
};
