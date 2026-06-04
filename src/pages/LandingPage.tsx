import React, { useState } from "react";
import { motion } from "motion/react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Command } from "lucide-react";
import { AccessModal } from "../components/AccessModal";
import { supabase } from "../lib/supabase";

export const LandingPage: React.FC = () => {
  const [isAccessOpen, setIsAccessOpen] = useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    const handleOAuthRedirect = async () => {
      if (
        window.location.hash.includes('access_token') ||
        window.location.hash.includes('refresh_token') ||
        window.location.search.includes('code=')
      ) {
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          window.history.replaceState({}, document.title, window.location.pathname);
          navigate('/chat');
        }
      }
    };

    handleOAuthRedirect();
  }, [navigate]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen font-sans selection:bg-white selection:text-black bg-[#121110] text-white overflow-x-hidden"
    >
      <AccessModal
        isOpen={isAccessOpen}
        onClose={() => setIsAccessOpen(false)}
      />

      {/* Header */}
      <nav className="fixed w-full left-0 top-0 z-50 flex items-center justify-between px-6 py-5 bg-[#121110]">
        <div className="flex items-center gap-2">
          <Command className="w-6 h-6 text-white" />
          <span className="font-sans font-bold text-xl tracking-tight text-white uppercase">Paralex</span>
        </div>

        <div className="hidden lg:flex items-center gap-8 text-[15px] font-medium text-white">
          <a href="#" className="hover:text-white/80 transition-colors">Product</a>
          <a href="#" className="hover:text-white/80 transition-colors">Enterprise</a>
          <a href="#" className="hover:text-white/80 transition-colors">Pricing</a>
          <a href="#" className="hover:text-white/80 transition-colors">Resources</a>
        </div>

        <div className="flex items-center gap-4 text-[15px] font-medium">
          <a href="mailto:openfrm.labs@gmail.com" className="hidden md:flex border border-white/20 px-4 py-1.5 rounded-full hover:bg-white/5 transition-colors">
            Contact
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-[1300px] mx-auto px-6 pt-20 md:pt-28 pb-32">
        <div className="max-w-3xl mb-14">
          <h1 className="text-[2.5rem] md:text-[2.5rem] lg:text-[2.5rem] font-sans font-medium leading-[1.05] tracking-tight text-white mb-8 pt-32">
            Built to make you <br className="hidden md:block" />
            extraordinarily productive
          </h1>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={() => setIsAccessOpen(true)}
              className="w-full sm:w-auto h-[3.25rem] px-8 text-[16px] font-medium bg-white text-black rounded-full hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
            >
              Try Paralex <ArrowUpRight className="w-5 h-5 ml-1" />
            </button>
            <button
              onClick={() => navigate('/docs')}
              className="w-full sm:w-auto h-[3.25rem] px-8 text-[16px] font-medium bg-[#2a2928] text-white rounded-full hover:bg-[#353433] transition-colors flex items-center justify-center gap-2 border border-transparent"
            >
              Read Docs <ArrowRight className="w-5 h-5 ml-1" />
            </button>
          </div>
        </div>

        {/* Hero Image */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="w-full mt-10 rounded-xl overflow-hidden shadow-2xl flex justify-center"
        >
          <img
            src="/heroimg.jpg"
            alt="Paralex Interface"
            className="w-full max-w-[1400px] object-cover block"
          />
        </motion.div>
      </main>

      {/* Voice Command Section Image */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[1300px] mx-auto px-6 mb-24 flex justify-center"
      >
        <img
          src="/voicecmdsection.png"
          alt="Voice Commands Interface"
          className="w-full rounded-xl shadow-2xl border border-white/10 object-cover block"
        />
      </motion.div>

      {/* Footer */}
      <footer className="bg-[#121110] text-white py-16 mt-10 border-t border-white/[0.05]">
        <div className="max-w-[1300px] mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-1 mb-16">
          <div>
            <h4 className="font-sans font-bold text-xl mb-6">Openfrm Labs</h4>
            <p className="text-white/60 text-sm leading-relaxed max-w-xs">
              Built for humans. Powered by intelligent AI.
            </p>
          </div>
        </div>
        <div className="max-w-[1300px] mx-auto px-6 pt-8 border-t border-white/[0.05] flex flex-col md:flex-row justify-between items-center text-sm font-medium text-white/60">
          <div className="mb-4 md:mb-0">
            © 2026 Openfrm Labs. All rights reserved.
          </div>
          <div className="flex gap-6">
            <a href="https://x.com/openfrmlabs" className="hover:text-white transition-colors">Twitter</a>
            <a href="https://www.linkedin.com/company/openfrm-labs" className="hover:text-white transition-colors">LinkedIn</a>
            <a href="mailto:openfrm.labs@gmail.com" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </motion.div>
  );
};
