import React, { useEffect, useRef, useState } from "react";

interface DotGridProps {
  dotSize?: number;
  gap?: number;
  opacity?: number;
  color?: string;
  className?: string;
  interactive?: boolean;
}

export const DotGrid: React.FC<DotGridProps> = ({
  dotSize = 2,
  gap = 24,
  opacity = 0.5,
  color = "var(--textPrimary)",
  className = "",
  interactive = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    if (!interactive) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Show spotlight if mouse is near or inside the grid area
      if (
        x >= -200 && x <= rect.width + 200 &&
        y >= -200 && y <= rect.height + 200
      ) {
        setMousePos({ x, y });
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    const handleMouseLeave = () => setIsHovering(false);

    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [interactive]);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 w-full h-full pointer-events-none overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {/* Base subtle grid */}
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          backgroundImage: `radial-gradient(circle at center, ${color} ${dotSize}px, transparent 0)`,
          backgroundSize: `${gap}px ${gap}px`,
          opacity: opacity * 0.3,
          maskImage: `linear-gradient(to bottom, black 20%, transparent 100%)`,
          WebkitMaskImage: `linear-gradient(to bottom, black 20%, transparent 100%)`,
        }}
      />
      
      {/* Interactive spotlight grid */}
      {interactive && (
        <div
          className="absolute inset-0 w-full h-full transition-opacity duration-300 ease-out"
          style={{
            backgroundImage: `radial-gradient(circle at center, ${color} ${dotSize}px, transparent 0)`,
            backgroundSize: `${gap}px ${gap}px`,
            opacity: isHovering ? opacity : 0,
            maskImage: `radial-gradient(circle 400px at ${mousePos.x}px ${mousePos.y}px, black 0%, transparent 100%)`,
            WebkitMaskImage: `radial-gradient(circle 400px at ${mousePos.x}px ${mousePos.y}px, black 0%, transparent 100%)`,
          }}
        />
      )}
    </div>
  );
};
