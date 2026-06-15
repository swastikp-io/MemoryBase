import React, { useState, useRef, useEffect } from "react";
import { Plus, ArrowUp, X, Square, Image, ChevronDown, Check, Search, AudioLines, Globe } from "lucide-react";
import { useSettingsStore } from "../store/settings";
import { useChatStore } from "../store/chatStore";
import { motion, AnimatePresence } from "motion/react";

import { ChatMode } from "../lib/models/modes";
import { MODEL_REGISTRY } from "../lib/models/registry";

interface ChatInputProps {
  onSendMessage: (content: string, images?: string[], webSearchEnabled?: boolean) => void;
  onStopStreaming: () => void;
  isStreaming: boolean;
  isCentered?: boolean;
  selectedMode: ChatMode;
  onSelectMode: (mode: ChatMode) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onStopStreaming,
  isStreaming,
  isCentered = false,
  selectedMode,
  onSelectMode
}) => {
  const settings = useSettingsStore();
  const webSearchEnabled = useChatStore(state => state.webSearchEnabled);
  const toggleWebSearch = useChatStore(state => state.toggleWebSearch);
  const [input, setInput] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const baseInputRef = useRef("");
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) {
        setShowAttachMenu(false);
      }
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) {
        setShowModelMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 112) + "px";
    }
  }, [input]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        
        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            currentTranscript += event.results[i][0].transcript;
          }
          setInput((baseInputRef.current + " " + currentTranscript).trim());
        };

        recognition.onend = () => {
          setIsListening(false);
        };
        
        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      baseInputRef.current = input;
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error("Speech recognition error:", e);
      }
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
    if ((input.trim() || images.length > 0) && !isStreaming) {
      onSendMessage(input.trim(), images.length > 0 ? images : undefined, webSearchEnabled);
      setInput("");
      setImages([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result && typeof event.target.result === 'string') {
          setImages(prev => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const hasContent = input.trim() || images.length > 0;

  return (
    <div id="chat-input-container" className={`absolute left-0 right-0 bg-transparent px-3 pointer-events-none md:px-5 transition-all duration-500 ease-in-out z-20 ${
      isCentered ? 'top-1/2 -translate-y-1/2 pb-5 pt-0 -mt-4' : 'bottom-0 pb-5 pt-2 md:pb-5'
    }`}>
      <div className="max-w-[880px] mx-auto w-full relative pointer-events-auto">

        <motion.form
          layout
          initial={{ borderRadius: 9999 }}
          onSubmit={handleSubmit}
          className={`flex items-center bg-[var(--surface)] border border-[var(--border)] px-3 py-2 transition-colors duration-300`}
          style={{ borderRadius: 9999 }}
        >
          <div className="relative flex-shrink-0 flex items-center justify-center text-text-primary px-2 group" ref={attachMenuRef}>
            <button 
              type="button"
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              className={`p-1.5 rounded-full transition-colors ${showAttachMenu ? 'bg-[var(--surfaceSecondary)] text-text-primary' : 'hover:bg-[var(--surfaceSecondary)] text-text-secondary hover:text-text-primary'}`}
            >
              <Plus className="w-[22px] h-[22px]" strokeWidth={1.5} />
            </button>

            {/* Tooltip */}
            {!showAttachMenu && (
              <div className="absolute bottom-[calc(100%+12px)] left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap bg-[var(--surface)] text-text-primary text-[13px] font-medium px-3 py-2 rounded-xl flex items-center gap-2 shadow-lg border border-[var(--border)]">
                Add files and more
                <div className="bg-[var(--surfaceSecondary)] text-text-secondary px-1.5 py-0.5 rounded text-[11px] font-mono leading-none border border-[var(--border)]">/</div>
              </div>
            )}

            {/* Menu */}
            <AnimatePresence>
              {showAttachMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-[calc(100%+12px)] left-0 w-56 bg-[var(--surface)] border border-[var(--border)] shadow-2xl rounded-2xl py-2 z-50 flex flex-col"
                >
                  <button
                    type="button"
                    onClick={() => {
                      fileInputRef.current?.click();
                      setShowAttachMenu(false);
                    }}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--surfaceSecondary)] transition-colors text-sm text-text-primary text-left w-full group/btn"
                  >
                    <Image className="w-4 h-4 text-text-secondary group-hover/btn:text-text-primary transition-colors" />
                    Upload Images
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            type="button"
            onClick={toggleWebSearch}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors whitespace-nowrap border ${
              webSearchEnabled
                ? 'bg-blue-500/10 text-blue-500 border-blue-500/20 shadow-sm'
                : 'bg-transparent text-text-secondary border-transparent hover:bg-[var(--surfaceSecondary)] hover:text-text-primary'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Search
          </button>

          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
          />

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask MemoryBase"
            className={`flex-1 bg-transparent resize-none border-none focus:ring-0 text-text-primary py-2 px-2 text-[15px] outline-none scrollbar-hide h-[40px] flex items-center placeholder-text-secondary`}
            rows={1}
            disabled={isStreaming}
            style={{ minHeight: '40px', paddingTop: '10px' }}
          />

          <div className="flex-shrink-0 flex items-center gap-2 pr-1">
            {/* Model Selector Dropdown */}
            <div className="relative" ref={modelMenuRef}>
              <button
                type="button"
                onClick={() => setShowModelMenu(!showModelMenu)}
                className={`p-1.5 rounded-full transition-colors ${showModelMenu ? 'bg-[var(--surfaceSecondary)] text-text-primary' : 'hover:bg-[var(--surfaceSecondary)] text-text-secondary hover:text-text-primary'}`}
                title={MODEL_REGISTRY[selectedMode]?.label || 'Standard'}
              >
                <ChevronDown className="w-[20px] h-[20px]" strokeWidth={1.5} />
              </button>

              <AnimatePresence>
                {showModelMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-[calc(100%+12px)] right-0 w-48 bg-[var(--surface)] border border-[var(--border)] shadow-2xl rounded-2xl py-2 z-50 flex flex-col"
                  >
                    {(Object.entries(MODEL_REGISTRY) as [ChatMode, { label: string }][]).map(([mode, config]) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => {
                          onSelectMode(mode);
                          setShowModelMenu(false);
                        }}
                        className="flex items-center justify-between px-4 py-2.5 hover:bg-[var(--surfaceSecondary)] transition-colors text-[13px] text-text-primary text-left w-full group/btn"
                      >
                        {config.label}
                        {selectedMode === mode && <Check className="w-4 h-4 text-text-primary" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence mode="wait">
              {isStreaming ? (
                <motion.button
                  key="stop"
                  initial={{ scale: 0, opacity: 0, rotate: -90 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ scale: 0, opacity: 0, rotate: 90 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  type="button"
                  onClick={onStopStreaming}
                  className="w-[34px] h-[34px] flex items-center justify-center rounded-full bg-[var(--accent-primary)] text-[var(--accent-fg)] transition-colors shadow-md hover:bg-[var(--accent-hover)]"
                  aria-label="Stop generating response"
                >
                  <Square className="w-4 h-4 fill-current" strokeWidth={3} />
                </motion.button>
              ) : hasContent ? (
                <motion.button
                  key="send"
                  initial={{ scale: 0, opacity: 0, rotate: -90 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ scale: 0, opacity: 0, rotate: 90 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  type="submit"
                  disabled={isStreaming}
                  className="w-[34px] h-[34px] flex items-center justify-center rounded-full bg-[var(--accent-primary)] text-[var(--accent-fg)] transition-colors hover:opacity-90"
                >
                  <ArrowUp className="w-5 h-5" strokeWidth={2.5} />
                </motion.button>
              ) : (
                <motion.button
                  key="voice"
                  initial={{ scale: 0, opacity: 0, rotate: 90 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ scale: 0, opacity: 0, rotate: -90 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  type="button"
                  onClick={toggleListening}
                  className={`w-[34px] h-[34px] flex items-center justify-center rounded-full transition-all ${
                    isListening 
                      ? 'bg-red-500/20 text-red-500 animate-pulse' 
                      : 'bg-[var(--accent-primary)] text-[var(--accent-fg)] hover:opacity-90 hover:scale-105'
                  }`}
                  title="Voice input"
                >
                  <AudioLines className="w-[18px] h-[18px]" strokeWidth={2.5} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </motion.form>
      </div>
    </div>
  );
};
