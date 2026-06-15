import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { Command, ArrowLeft, Brain, Database, Copy, Check, Info, LayoutTemplate, Cpu, Search, Link as LinkIcon, BookOpen } from "lucide-react";

const CodeBlock = () => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    const code = 'export OPENROUTER_API_KEY="sk-or-v1-..."\nexport DEFAULT_MODEL="anthropic/claude-3-5-sonnet"';
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-3xl overflow-hidden bg-[var(--surfaceSecondary)] border border-[var(--border)] shadow-2xl">
      <div className="flex items-center justify-between px-6 py-4 bg-[var(--surface)] border-b border-[var(--border)]">
        <span className="text-sm font-mono text-[var(--textTertiary)]">bash</span>
        <button 
          onClick={handleCopy} 
          className="p-2 hover:bg-[var(--surfaceSecondary)] rounded-lg transition-colors text-[var(--textTertiary)] hover:text-[var(--textPrimary)]" 
          aria-label="Copy code"
        >
          {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
        </button>
      </div>
      <pre className="p-8 overflow-x-auto m-0 text-[15px] font-mono leading-loose text-[var(--textSecondary)] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <span className="text-[var(--textTertiary)]"># Setting up your workspace</span>{"\n\n"}
        <span className="text-[var(--accent)]">export</span> <span className="text-[var(--textPrimary)]">OPENROUTER_API_KEY</span>=<span className="text-[var(--success)]">"sk-or-v1-..."</span>{"\n"}
        <span className="text-[var(--accent)]">export</span> <span className="text-[var(--textPrimary)]">DEFAULT_MODEL</span>=<span className="text-[var(--success)]">"anthropic/claude-3-5-sonnet"</span>
      </pre>
    </div>
  );
};

const Callout = ({ children, title }: { children: React.ReactNode, title?: string }) => {
  return (
    <div className="flex gap-5 p-6 rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-8 mt-2">
      <Info className="w-6 h-6 text-[var(--accent)] shrink-0 mt-0.5" />
      <div>
        {title && <h5 className="text-lg font-medium text-[var(--textPrimary)] mb-2">{title}</h5>}
        <div className="text-[var(--textSecondary)] text-base leading-relaxed">{children}</div>
      </div>
    </div>
  );
};

const ArchitectureCard = ({ title, items, icon: Icon }: any) => (
  <div className="p-8 rounded-3xl bg-[var(--surfaceSecondary)] border border-[var(--border)] hover:border-[var(--border)] transition-colors h-full flex flex-col">
    <div className="flex items-center gap-4 mb-6">
      <div className="p-3 rounded-xl bg-[var(--surfaceSecondary)] border border-[var(--border)] text-[var(--textSecondary)]">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-xl font-medium text-[var(--textPrimary)]">{title}</h3>
    </div>
    <ul className="space-y-4 flex-1">
      {items.map((item: string, i: number) => (
        <li key={i} className="flex items-start gap-4 text-lg text-[var(--textSecondary)] leading-relaxed">
          <span className="mt-2.5 w-1.5 h-1.5 rounded-full bg-[var(--surfaceSecondary)] shrink-0" />
          {item}
        </li>
      ))}
    </ul>
  </div>
);

const FeatureCard = ({ title, description, icon: Icon }: any) => (
  <div className="p-8 rounded-3xl bg-[var(--surfaceSecondary)] border border-[var(--border)] hover:border-[var(--border)] transition-colors h-full flex flex-col">
    <div className="p-4 w-fit rounded-2xl bg-[var(--surfaceSecondary)] border border-[var(--border)] mb-8">
      <Icon className="w-7 h-7 text-[var(--textSecondary)]" />
    </div>
    <h3 className="text-2xl font-medium text-[var(--textPrimary)] mb-4">{title}</h3>
    <p className="text-lg text-[var(--textSecondary)] leading-8 flex-1">{description}</p>
  </div>
);

function useScrollSpy(ids: string[], offset = 150) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + offset;
      let currentId = "";
      
      for (const id of ids) {
        const element = document.getElementById(id);
        if (element) {
          const { top } = element.getBoundingClientRect();
          const absoluteTop = top + window.scrollY;
          if (absoluteTop <= scrollPosition) {
            currentId = id;
          }
        }
      }
      
      if (currentId !== activeId) {
        setActiveId(currentId);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [ids, offset, activeId]);

  return activeId;
}

export const DocsPage: React.FC = () => {
  const sections = [
    { id: "introduction", label: "What is MemoryBase" },
    { id: "architecture", label: "Architecture" },
    { id: "features", label: "Features" },
    { id: "configuration", label: "Configuration" },
    { id: "getting-started", label: "Getting Started" },
  ];

  const allIds = sections.map(s => s.id);
  const activeId = useScrollSpy(allIds, 200);

  const scrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const top = element.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen font-sans bg-[var(--background)] text-[var(--textPrimary)] selection:bg-[var(--textPrimary)] selection:text-[var(--background)]"
    >
      
      {/* Header */}
      <nav className="fixed w-full left-0 top-0 z-50 flex items-center justify-between px-6 py-4 bg-[var(--background)]/95 backdrop-blur-md border-b border-[var(--border)]">
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <Command className="w-5 h-5 text-[var(--textPrimary)]" />
          <span className="font-sans font-semibold text-lg tracking-tight text-[var(--textPrimary)] uppercase">MemoryBase</span>
        </Link>
        
        <div className="flex items-center gap-4 text-sm font-medium">
          <Link to="/" className="flex items-center gap-2 text-[var(--textSecondary)] hover:text-[var(--textPrimary)] transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
        </div>
      </nav>

      {/* Layout Container */}
      <div className="max-w-[1600px] mx-auto flex pt-[73px]">
        
        {/* Main Content Area */}
        <main className="flex-1 w-full min-w-0 px-6 lg:px-16 xl:px-24 py-24 pb-40 flex justify-center">
          <div className="w-full max-w-[950px]">
            
            {/* Header Area */}
            <div className="mb-32">
              <div className="flex items-center gap-4 text-[15px] font-medium text-[var(--textTertiary)] mb-8 border-b border-[var(--border)] pb-5">
                <span className="flex items-center gap-2"><BookOpen className="w-4 h-4" /> Documentation</span>
                <span>•</span>
                <span>Last Updated: June 2026</span>
                <span>•</span>
                <span>Version: 1.0.0</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-medium tracking-tight text-[var(--textPrimary)] mb-8 leading-[1.1]">
                Everything you need to know about MemoryBase
              </h1>
              <p className="text-xl md:text-2xl text-[var(--textSecondary)] leading-[1.6] max-w-[65ch]">
                The intelligent AI workspace built for deep, productive work.
              </p>
            </div>

            {/* Section 1: What is MemoryBase */}
            <section id="introduction" className="scroll-mt-32 mb-32 group">
              <div className="flex items-center gap-3 mb-10">
                <h2 className="text-4xl font-medium text-[var(--textPrimary)]">What is MemoryBase?</h2>
                <LinkIcon className="w-6 h-6 text-transparent group-hover:text-[var(--textTertiary)] transition-colors cursor-pointer" onClick={() => scrollTo('introduction')} />
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 xl:gap-16 items-start">
                <div className="text-lg text-[var(--textSecondary)] leading-8 space-y-8 max-w-[75ch]">
                  <p>
                    MemoryBase is a context-aware, persistent AI assistant designed for deep, productive work. Unlike traditional chat interfaces, MemoryBase functions as an integrated workspace that remembers your context, reasons through complex problems, and provides reliable, structured answers.
                  </p>
                  <p>
                    Built to make you extraordinarily productive, it serves as a unified command center for all your AI needs.
                  </p>
                </div>
                <div className="bg-[var(--surfaceSecondary)] p-8 md:p-10 rounded-3xl border border-[var(--border)]">
                  <h3 className="text-2xl font-medium text-[var(--textPrimary)] mb-4">The MemoryBase Philosophy</h3>
                  <p className="text-[var(--textSecondary)] text-lg leading-8">
                    We believe AI tools shouldn't just be conversational bots. They should be integrated, stateful extensions of your thought process. Everything we build is centered around minimizing friction and maximizing context retention.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 2: Architecture */}
            <section id="architecture" className="scroll-mt-32 mb-32 group">
              <div className="flex items-center gap-3 mb-10">
                <h2 className="text-4xl font-medium text-[var(--textPrimary)]">Architecture</h2>
                <LinkIcon className="w-6 h-6 text-transparent group-hover:text-[var(--textTertiary)] transition-colors cursor-pointer" onClick={() => scrollTo('architecture')} />
              </div>
              <p className="text-lg text-[var(--textSecondary)] leading-8 mb-12 max-w-[75ch]">
                MemoryBase is built with a modern, high-performance tech stack ensuring speed and reliability:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <ArchitectureCard 
                  title="Frontend" 
                  icon={LayoutTemplate} 
                  items={["React", "Tailwind CSS", "Framer Motion", "Fluid, uncompromised performance"]} 
                />
                <ArchitectureCard 
                  title="Backend" 
                  icon={Database} 
                  items={["Supabase", "Authentication", "Real-time sync", "Secure state storage"]} 
                />
                <ArchitectureCard 
                  title="Local Env" 
                  icon={Cpu} 
                  items={["Deep system integrations", "Voice capture", "Workspace orchestration"]} 
                />
              </div>
            </section>

            {/* Section 3: Features */}
            <section id="features" className="scroll-mt-32 mb-32 group">
              <div className="flex items-center gap-3 mb-10">
                <h2 className="text-4xl font-medium text-[var(--textPrimary)]">Features</h2>
                <LinkIcon className="w-6 h-6 text-transparent group-hover:text-[var(--textTertiary)] transition-colors cursor-pointer" onClick={() => scrollTo('features')} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                <FeatureCard 
                  title="Persistent Memory" 
                  icon={Database} 
                  description="Never repeat yourself. MemoryBase stores critical context across sessions, retrieving pertinent facts exactly when you need them." 
                />
                <FeatureCard 
                  title="Deep Reasoning" 
                  icon={Brain} 
                  description="MemoryBase uses an advanced reasoning engine to break down complex queries, analyze paths, and formulate robust solutions." 
                />
                <FeatureCard 
                  title="Open Integration" 
                  icon={Command} 
                  description="We avoid locking you into a single proprietary model ecosystem. Bring your own OpenRouter API key and unlock hundreds of models." 
                />
              </div>
            </section>

            {/* Section 4: Configuration */}
            <section id="configuration" className="scroll-mt-32 mb-32 group">
              <div className="flex items-center gap-3 mb-10">
                <h2 className="text-4xl font-medium text-[var(--textPrimary)]">Configuration</h2>
                <LinkIcon className="w-6 h-6 text-transparent group-hover:text-[var(--textTertiary)] transition-colors cursor-pointer" onClick={() => scrollTo('configuration')} />
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-5 gap-12 xl:gap-16 items-start">
                <div className="xl:col-span-2 text-lg text-[var(--textSecondary)] leading-8 space-y-8 max-w-[75ch]">
                  <p>
                    Setting up MemoryBase is straightforward. You have full control over which models to use and how they are authenticated.
                  </p>
                  <p>
                    By configuring your OpenRouter API key locally, your keys and usage data are stored on your device and never sent to our servers.
                  </p>
                </div>
                <div className="xl:col-span-3 w-full">
                  <CodeBlock />
                </div>
              </div>
            </section>

            {/* Section 5: Getting Started */}
            <section id="getting-started" className="scroll-mt-32 mb-10 group border-t border-[var(--border)] pt-32">
              <div className="flex items-center gap-3 mb-16">
                <h2 className="text-4xl font-medium text-[var(--textPrimary)]">Getting Started</h2>
                <LinkIcon className="w-6 h-6 text-transparent group-hover:text-[var(--textTertiary)] transition-colors cursor-pointer" onClick={() => scrollTo('getting-started')} />
              </div>
              
              <div className="flex flex-col md:flex-row gap-10 md:gap-6 lg:gap-10 relative">
                <div className="hidden md:block absolute top-[35px] left-10 right-10 h-px bg-[var(--surfaceSecondary)]" />
                
                <div className="flex-1 relative z-10 flex flex-col items-center md:items-start text-center md:text-left">
                  <div className="w-16 h-16 rounded-full bg-[var(--surfaceSecondary)] border border-[var(--border)] flex items-center justify-center text-xl font-medium text-[var(--textPrimary)] shadow-xl mb-8">1</div>
                  <h4 className="text-xl font-medium text-[var(--textPrimary)] mb-3">Download</h4>
                  <p className="text-[var(--textSecondary)] text-lg leading-relaxed">Get the application or access the web interface.</p>
                </div>
                
                <div className="flex-1 relative z-10 flex flex-col items-center md:items-start text-center md:text-left">
                  <div className="w-16 h-16 rounded-full bg-[var(--surfaceSecondary)] border border-[var(--border)] flex items-center justify-center text-xl font-medium text-[var(--textPrimary)] shadow-xl mb-8">2</div>
                  <h4 className="text-xl font-medium text-[var(--textPrimary)] mb-3">Sign In</h4>
                  <p className="text-[var(--textSecondary)] text-lg leading-relaxed">Use your preferred secure authentication method.</p>
                </div>

                <div className="flex-1 relative z-10 flex flex-col items-center md:items-start text-center md:text-left">
                  <div className="w-16 h-16 rounded-full bg-[var(--surfaceSecondary)] border border-[var(--border)] flex items-center justify-center text-xl font-medium text-[var(--textPrimary)] shadow-xl mb-8">3</div>
                  <h4 className="text-xl font-medium text-[var(--textPrimary)] mb-3">Configure</h4>
                  <p className="text-[var(--textSecondary)] text-lg leading-relaxed">Set up your OpenRouter key in the settings panel.</p>
                </div>

                <div className="flex-1 relative z-10 flex flex-col items-center md:items-start text-center md:text-left">
                  <div className="w-16 h-16 rounded-full bg-[var(--surfaceSecondary)] border border-[var(--border)] flex items-center justify-center text-xl font-medium text-[var(--textPrimary)] shadow-xl mb-8">4</div>
                  <h4 className="text-xl font-medium text-[var(--textPrimary)] mb-3">Start</h4>
                  <p className="text-[var(--textSecondary)] text-lg leading-relaxed">Chat or drop files to begin.</p>
                </div>
              </div>
            </section>
            
          </div>
        </main>

        
      </div>
    </motion.div>
  );
};
