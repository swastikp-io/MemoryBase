import React, { createContext, useContext, useState } from "react";
import { TooltipRoot, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Globe } from "lucide-react";

interface SourceContextType {
  href: string;
}
const SourceContext = createContext<SourceContextType | null>(null);

export const Source = ({ href, children }: { href: string; children: React.ReactNode }) => {
  return (
    <SourceContext.Provider value={{ href }}>
      <TooltipRoot delayDuration={200}>
        {children}
      </TooltipRoot>
    </SourceContext.Provider>
  );
};

export const SourceTrigger = ({ showFavicon }: { showFavicon?: boolean }) => {
  const context = useContext(SourceContext);
  if (!context) throw new Error("SourceTrigger must be used within Source");
  
  const [imgError, setImgError] = useState(false);
  let domain = context.href;
  try {
    domain = new URL(context.href).hostname.replace(/^www\./, "");
  } catch (e) {
    // Keep domain as href if parsing fails
  }
  
  return (
    <TooltipTrigger asChild>
      <a 
        href={context.href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 h-8 px-3 rounded-full text-sm font-medium border border-[var(--border)] bg-[var(--surfaceSecondary)] hover:bg-[var(--surface)] text-text-primary transition-colors hover:border-text-secondary/30"
      >
        {showFavicon && (
          imgError ? (
            <Globe className="w-4 h-4 text-text-secondary shrink-0" />
          ) : (
            <img 
              src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`} 
              alt={domain} 
              className="w-4 h-4 rounded-sm shrink-0"
              onError={() => setImgError(true)}
            />
          )
        )}
        <span className="truncate max-w-[140px]">{domain}</span>
      </a>
    </TooltipTrigger>
  );
};

export const SourceContent = ({ title, description }: { title: string; description?: string }) => {
  return (
    <TooltipContent 
      sideOffset={8} 
      className="w-[300px] p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xl flex flex-col gap-2 z-[9999]"
    >
      <div className="font-semibold text-[13px] text-text-primary line-clamp-2 leading-snug">{title}</div>
      {description && <div className="text-[12px] text-text-secondary line-clamp-3 leading-relaxed">{description}</div>}
    </TooltipContent>
  );
};
