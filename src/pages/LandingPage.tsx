import React, { useState } from "react";
import { motion } from "motion/react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Command, Sun, Moon } from "lucide-react";
import { useSettingsStore } from "../store/settings";
import { DotGrid } from "../components/ui/dot-grid";


export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { appearance, updateAppearance } = useSettingsStore();
  const themeMode = appearance?.themeMode || 'light';


  const toggleTheme = () => {
    updateAppearance({ themeMode: themeMode === 'light' ? 'dark' : 'light' });
  };

  const handleTryMemoryBase = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate('/chat');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen font-sans selection:bg-[var(--textPrimary)] selection:text-[var(--background)] bg-[var(--background)] text-[var(--textPrimary)] overflow-x-hidden"
    >
      {/* Header */}
      <nav className="fixed w-full left-0 top-0 z-50 flex items-center justify-between px-6 py-5 bg-[var(--background)]">
        <div className="flex items-center gap-2">
          <Command className="w-6 h-6 text-[var(--textPrimary)]" />
          <span className="font-sans font-bold text-xl tracking-tight text-[var(--textPrimary)] uppercase">MemoryBase</span>
        </div>

        <div className="flex items-center gap-4 text-[15px] font-medium">
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-full border border-[var(--border)] hover:bg-[var(--surfaceSecondary)] transition-colors text-[var(--textPrimary)]"
            aria-label={themeMode === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
            title={themeMode === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
          >
            {themeMode === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
          <a href="mailto:openfrm.labs@gmail.com" className="hidden md:flex border border-[var(--border)] px-4 py-1.5 rounded-full hover:bg-[var(--surfaceSecondary)] transition-colors">
            Contact
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative w-full overflow-hidden">
        {/* Interactive Dot Grid Background */}
        <DotGrid className="top-0 left-0" />
        
        {/* Gradient Overlay to fade out at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[var(--background)] to-transparent pointer-events-none" />

        <div className="relative max-w-[1300px] mx-auto px-6 pt-32 md:pt-48 pb-32">
          <div className="max-w-3xl mb-14">
            <h1 className="text-[2.5rem] md:text-[2.5rem] lg:text-[2.5rem] font-sans font-medium leading-[1.05] tracking-tight text-[var(--textPrimary)] mb-8">
              Built to make you <br className="hidden md:block" />
              extraordinarily productive
            </h1>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <button
                onClick={handleTryMemoryBase}
                className={`w-full sm:w-auto h-[3.25rem] px-8 text-[16px] font-medium rounded-full flex items-center justify-center gap-2 transition-colors duration-200 ease-in-out ${themeMode === 'light' ? 'bg-[#0D0D0D] text-[#FFFFFF] hover:bg-[#262626]' : 'bg-[var(--textPrimary)] text-[var(--background)] hover:bg-[var(--textSecondary)] text-black'}`}
              >
                Try MemoryBase <ArrowUpRight className="w-5 h-5 ml-1" />
              </button>
              <button
                onClick={() => navigate('/docs')}
                className="w-full sm:w-auto h-[3.25rem] px-8 text-[16px] font-medium bg-[var(--surfaceSecondary)] text-[var(--textPrimary)] rounded-full hover:bg-[var(--surface)] transition-colors flex items-center justify-center gap-2 border border-transparent"
              >
                Read Docs <ArrowRight className="w-5 h-5 ml-1" />
              </button>
            </div>
          </div>
        </div>
      </main>



      {/* Footer */}
      <footer className="bg-[var(--background)] text-[var(--textPrimary)] py-16 mt-10 border-t border-[var(--border)]">
        <div className="max-w-[1300px] mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-1 mb-16">
          <div>
            <h4 className="font-sans font-bold text-xl mb-6">Openfrm Labs</h4>
            <p className="text-[var(--textSecondary)] text-sm leading-relaxed max-w-xs">
              Built for humans. Powered by intelligent AI.
            </p>
          </div>
        </div>
        <div className="max-w-[1300px] mx-auto px-6 pt-8 border-t border-[var(--border)] flex flex-col md:flex-row justify-between items-center text-sm font-medium text-[var(--textSecondary)]">
          <div className="mb-4 md:mb-0">
            © 2026 Openfrm Labs. All rights reserved.
          </div>
          <div className="flex gap-6">
            <a href="https://x.com/openfrmlabs" className="hover:text-[var(--textPrimary)] transition-colors">Twitter</a>
            <a href="https://www.linkedin.com/company/openfrm-labs" className="hover:text-[var(--textPrimary)] transition-colors">LinkedIn</a>
            <a href="mailto:openfrm.labs@gmail.com" className="hover:text-[var(--textPrimary)] transition-colors">Contact</a>
          </div>
        </div>
      </footer>


    </motion.div>
  );
};
