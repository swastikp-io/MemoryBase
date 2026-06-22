import React from "react";
import { motion } from "motion/react";
import { HeroSection } from "./HeroSection";

import { FooterDisclaimer } from "./FooterDisclaimer";

interface ChatLandingPageProps {
  onSelectSuggestion: (suggestion: string) => void;
  children: React.ReactNode;
}

export const ChatLandingPage: React.FC<ChatLandingPageProps> = ({ onSelectSuggestion, children }) => {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-4 relative z-10 min-h-[500px]">
      <HeroSection />
      
      <div className="mt-8">

      </div>
      
      <div className="mt-10 w-full max-w-4xl relative z-30">
        {children}
      </div>
      
      <FooterDisclaimer />
    </div>
  );
};
