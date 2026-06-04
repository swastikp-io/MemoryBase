import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

const tracks = [
  { title: "Flow State", src: "/flowstate.mp3" }
];

export const MinimalMusicPlayer: React.FC = () => {
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(tracks[currentTrackIndex].src);
    
    const handleEnded = () => {
      setCurrentTrackIndex((prev) => (prev + 1) % tracks.length);
    };
    
    audioRef.current.addEventListener('ended', handleEnded);
    
    const tryPlay = () => {
      if (audioRef.current) {
        audioRef.current.play().catch(() => {
          // Auto-play blocked, try again on interaction
          window.addEventListener('click', tryPlay, { once: true });
          window.addEventListener('keydown', tryPlay, { once: true });
        });
      }
    };
    
    tryPlay();
    
    return () => {
      audioRef.current?.removeEventListener('ended', handleEnded);
      audioRef.current?.pause();
      window.removeEventListener('click', tryPlay);
      window.removeEventListener('keydown', tryPlay);
    };
  }, [currentTrackIndex]);

  return (
    <div className="relative flex flex-col items-center justify-center font-sans">
      <div className="flex items-center gap-1.5 text-[13px] tracking-wide select-none">
        <span className="text-text-primary/40 font-medium">Playing</span>
        <div className="relative overflow-hidden w-[100px] h-[20px] flex items-center">
          <AnimatePresence mode="popLayout">
            <motion.span
              key={currentTrackIndex}
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -15, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="absolute left-0 text-text-primary font-medium truncate w-full"
            >
              {tracks[currentTrackIndex].title}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
