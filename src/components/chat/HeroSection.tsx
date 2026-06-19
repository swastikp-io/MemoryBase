import React from "react";

export const HeroSection: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center w-full px-4 text-center z-10">
      <h2 className="text-[28px] md:text-[32px] text-text-primary font-medium tracking-tight">
        What's on your mind today?
      </h2>
    </div>
  );
};
