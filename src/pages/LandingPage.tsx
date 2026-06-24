import React from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { Command } from "lucide-react";

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const handleTryMemoryBase = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate('/chat');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="relative w-screen h-screen overflow-hidden"
      style={{ fontFamily: '"DM Sans", sans-serif' }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap');
      `}</style>
      {/* Background Image */}
      <img
        src="/assets/047cde24-ab9b-403e-b9b9-715631ee1695.png"
        alt="Background"
        className="absolute inset-0 w-full h-full object-cover z-0"
      />

      {/* Top Navigation */}
      <nav className="absolute top-0 left-0 w-full z-10 flex items-center justify-between px-8 py-6">
        {/* Left: Logo */}
        <div className="flex items-center gap-2 text-black">
          <Command className="w-6 h-6" />
          <span className="font-bold text-xl tracking-tight">MemoryBase</span>
        </div>

        {/* Center: Links */}
        <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center justify-center gap-8 text-black font-medium">
          <button onClick={() => navigate('/docs')} className="hover:opacity-70 transition-opacity">Docs</button>
          <a href="https://github.com/swastikp-io/MemoryBase" target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity">GitHub</a>
          <a href="mailto:openfrm.labs@gmail.com" className="hover:opacity-70 transition-opacity">Contact</a>
        </div>

        {/* Right: Log In Button */}
        <div>
          <button
            onClick={() => navigate('/login')}
            className="bg-black text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Log In
          </button>
        </div>
      </nav>

      {/* Center Layout */}
      <div className="absolute inset-0 flex flex-col md:flex-row items-center justify-center z-10 pointer-events-none w-full max-w-[1300px] mx-auto px-4">
        <div className="flex-1 flex justify-center md:justify-end md:pr-8 mb-4 md:mb-0">
          <span className="text-white text-2xl md:text-[26px] font-medium drop-shadow-md text-center md:text-right">
            Built to make you
          </span>
        </div>

        <div className="pointer-events-auto flex-shrink-0">
          <button
            onClick={handleTryMemoryBase}
            className="flex items-center justify-center bg-black/40 backdrop-blur-md border border-white/20 text-white px-8 py-3.5 rounded-full font-medium hover:bg-black/60 transition-all shadow-lg whitespace-nowrap text-lg"
          >
            Ask MemoryBase
          </button>
        </div>

        <div className="flex-1 flex justify-center md:justify-start md:pl-8 mt-4 md:mt-0">
          <span className="text-white text-2xl md:text-[26px] font-medium drop-shadow-md text-center md:text-left">
            Extraordinarily Productive
          </span>
        </div>
      </div>

      {/* Bottom Area */}
      <div className="absolute bottom-0 left-0 w-full z-10 px-8 pb-8 pt-4 flex flex-col md:flex-row items-center md:items-end justify-between pointer-events-none gap-6 md:gap-0">

        {/* Left: Copyright */}
        <div className="text-white/90 text-sm font-medium pointer-events-auto flex-1 w-full md:w-auto text-center md:text-left drop-shadow-md">
          © 2026 Openfrm Labs. All rights reserved.
        </div>

        {/* Right: Social Links */}
        <div className="flex justify-center md:justify-end gap-6 text-white/90 text-sm font-medium pointer-events-auto flex-1 w-full md:w-auto drop-shadow-md">
          <a href="https://x.com/openfrmlabs" className="hover:text-white transition-colors">Twitter</a>
          <a href="https://www.linkedin.com/company/openfrm-labs" className="hover:text-white transition-colors">LinkedIn</a>
        </div>

      </div>
    </motion.div>
  );
};
