import React, { useState, useRef, useEffect, useCallback } from "react";
import { Paperclip, Brain, Search, Send, Square, FlaskConical, ChevronDown, Check, Globe } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { useChatStore } from "../../store/chatStore";
import { ChatMode } from "../../lib/models/modes";
import { ModelSelector } from "./ModelSelector";

import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputActions,
  PromptInputAttachments,
  PromptInputAttachment,
} from "../ui/prompt-input";

interface ChatPromptInputProps {
  onSendMessage: (content: string, images?: string[], webSearchEnabled?: boolean) => void;
  onStopStreaming: () => void;
  isStreaming: boolean;
  isCentered?: boolean;
  selectedMode: ChatMode;
  onSelectMode: (mode: ChatMode) => void;
  isGeneratingPlan?: boolean;
}

export const ChatPromptInput: React.FC<ChatPromptInputProps> = ({
  onSendMessage,
  onStopStreaming,
  isStreaming,
  isCentered = false,
  selectedMode,
  onSelectMode,
  isGeneratingPlan = false
}) => {
  const webSearchEnabled = useChatStore(state => state.webSearchEnabled);
  const toggleWebSearch = useChatStore(state => state.toggleWebSearch);
  const activeChatId = useChatStore(state => state.activeChatId);

  const [input, setInput] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const draftKey = `draft_${activeChatId || 'new'}`;

  // Load draft
  useEffect(() => {
    const draft = localStorage.getItem(draftKey);
    if (draft) setInput(draft);
    else setInput("");
    // We intentionally don't load draft images for simplicity, but we could.
  }, [draftKey]);

  // Save draft
  useEffect(() => {
    if (input.trim()) {
      localStorage.setItem(draftKey, input);
    } else {
      localStorage.removeItem(draftKey);
    }
  }, [input, draftKey]);

  const handleSubmit = useCallback(() => {
    if ((input.trim() || images.length > 0) && !isStreaming) {
      onSendMessage(input.trim(), images.length > 0 ? images : undefined, webSearchEnabled);
      setInput("");
      setImages([]);
      localStorage.removeItem(draftKey);
    }
  }, [input, images, isStreaming, onSendMessage, webSearchEnabled, draftKey]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      if (e.shiftKey) {
        // Allow new line
      } else if (e.metaKey || e.ctrlKey) {
        // Force submit
        e.preventDefault();
        handleSubmit();
      } else {
        // Normal submit
        e.preventDefault();
        handleSubmit();
      }
    } else if (e.key === "Escape") {
      if (isStreaming) {
        e.preventDefault();
        onStopStreaming();
      }
    }
  };

  const handleFiles = (files: FileList | null) => {
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
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const onPaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData.files.length > 0) {
      handleFiles(e.clipboardData.files);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const hasContent = input.trim() || images.length > 0;

  return (
    <div className="w-full relative pointer-events-auto z-30">
      <PromptInput
        className={`transition-all duration-300 ${isDragging ? 'border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)] ring-opacity-20' : ''}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
          {isDragging && (
            <div className="absolute inset-0 bg-[var(--surfaceSecondary)]/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-2xl border-2 border-dashed border-[var(--accent-primary)]">
              <span className="text-[var(--accent-primary)] font-medium">Drop images here</span>
            </div>
          )}

          <PromptInputAttachments>
            {images.map((src, i) => (
              <PromptInputAttachment key={i} src={src} onRemove={() => removeImage(i)} />
            ))}
          </PromptInputAttachments>

          <PromptInputTextarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={onPaste}
            placeholder="Ask anything..."
            disabled={isStreaming}
          />

          <PromptInputFooter>
            {/* Left Zone: Actions */}
            <PromptInputActions>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                ref={fileInputRef}
                onChange={(e) => handleFiles(e.target.files)}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-text-secondary hover:text-text-primary hover:bg-[var(--surfaceSecondary)] transition-colors"
                title="Attach files"
              >
                <Paperclip className="w-4 h-4" strokeWidth={2} />
              </button>

              <button
                type="button"
                onClick={() => onSelectMode(selectedMode === 'research' ? 'standard' : 'research')}
                className={`flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[13px] font-medium transition-colors ${
                  selectedMode === 'research'
                    ? 'bg-blue-500/10 text-blue-500'
                    : 'text-text-secondary hover:bg-[var(--surfaceSecondary)] hover:text-text-primary'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Research</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectMode(selectedMode === 'reasoning' ? 'standard' : 'reasoning')}
                className={`flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[13px] font-medium transition-colors ${
                  selectedMode === 'reasoning'
                    ? 'bg-purple-500/10 text-purple-500'
                    : 'text-text-secondary hover:bg-[var(--surfaceSecondary)] hover:text-text-primary'
                }`}
              >
                <Brain className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reasoning</span>
              </button>

              <button
                type="button"
                onClick={toggleWebSearch}
                className={`flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[13px] font-medium transition-colors ${
                  webSearchEnabled
                    ? 'bg-blue-500/10 text-blue-500'
                    : 'text-text-secondary hover:bg-[var(--surfaceSecondary)] hover:text-text-primary'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Search</span>
              </button>
            </PromptInputActions>

            {/* Center Zone: Spacer */}
            <div className="flex-1" />

            {/* Right Zone: Model + Send */}
            <div className="flex items-center gap-2 shrink-0">
              <ModelSelector selectedMode={selectedMode} onSelectMode={onSelectMode} />

              <AnimatePresence mode="wait">
                {isStreaming ? (
                  <motion.button
                    key="stop"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    type="button"
                    onClick={onStopStreaming}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-text-primary text-[var(--surface)] hover:opacity-90 transition-opacity shadow-sm"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" strokeWidth={3} />
                  </motion.button>
                ) : (
                  <motion.button
                    key="send"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    type="button"
                    onClick={handleSubmit}
                    disabled={!hasContent}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-text-primary text-[var(--surface)] hover:opacity-90 transition-opacity shadow-sm disabled:opacity-30 disabled:hover:opacity-30"
                  >
                    <Send className="w-4 h-4" strokeWidth={2} />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </PromptInputFooter>
        </PromptInput>
    </div>
  );
};
