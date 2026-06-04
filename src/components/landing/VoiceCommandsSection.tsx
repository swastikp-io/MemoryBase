import React from 'react';

export const VoiceCommandsSection = () => {
  return (
    <section className="py-24 max-w-[1300px] mx-auto px-6 relative">
      <div className="max-w-3xl mb-12">
        <div className="text-white font-semibold tracking-wider text-sm uppercase mb-4">
          Voice Commands
        </div>
        <h2 className="text-4xl md:text-5xl font-medium text-white tracking-tight leading-[1.15] mb-6">
          Your Computer.<br/>Controlled by Voice.
        </h2>
        <div className="text-lg text-white/60 leading-relaxed space-y-6">
          <p>
            Stop clicking through menus and repeating tasks. Simply speak naturally and let Paralex handle the execution.
          </p>
          <p>
            From opening applications and managing your workspace to researching information and automating repetitive actions, Paralex turns conversation into action.
          </p>
        </div>
      </div>
    </section>
  );
};
