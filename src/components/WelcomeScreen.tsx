import React from "react";

export const WelcomeScreen: React.FC = () => {
  return (
    <div className="absolute top-1/2 left-0 right-0 -translate-y-[calc(50%+4rem)] flex flex-col items-center justify-center w-full px-4 text-center pointer-events-none pb-30">
      <h2 className="text-[32px] text-text-primary font-medium tracking-tight">
        What's on your mind today?
      </h2>
    </div>
  );
};
