import React, { useState, useRef, useEffect, useCallback } from "react";
import { Paperclip, Brain, Search, Send, Square, FlaskConical, ChevronDown, Check, Globe, Plus, MoreHorizontal, Mic, ArrowUp } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { useChatStore } from "../../store/chatStore";
import { useSpeechRecognition } from "../../hooks/useSpeechRecognition";
import { ChatMode } from "../../lib/models/modes";
import { MODEL_REGISTRY } from "../../lib/models/registry";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
} from "../ui/dropdown-menu";

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

  const handleSpeechResult = useCallback((text: string) => {
    setInput(prev => {
      const space = prev && !prev.endsWith(' ') ? ' ' : '';
      return prev + space + text;
    });
  }, []);

  const { isRecording, isSupported, toggleRecording } = useSpeechRecognition(handleSpeechResult);

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

          <PromptInputFooter className="px-4 pb-4 pt-0">
            {/* Left Zone: Actions */}
            <PromptInputActions className="gap-2">
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
                className="chat-toolbar-btn"
                title="Attach files"
              >
                <Plus className="w-5 h-5" strokeWidth={2.5} />
              </button>

              <button
                type="button"
                onClick={toggleWebSearch}
                className={`flex items-center gap-2 h-10 px-4 rounded-full chat-pill ${
                  webSearchEnabled ? 'active' : ''
                }`}
              >
                <Globe className="w-[18px] h-[18px] icon" strokeWidth={2} />
                <span className="text-[15px] font-medium pr-1">Search</span>
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="chat-toolbar-btn"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuContent 
                    align="start" 
                    sideOffset={8}
                    className="w-52 bg-[var(--chat-bg)] border border-[var(--chat-border)] shadow-[var(--chat-shadow)] rounded-2xl py-1 z-[9999]"
                  >
                    {(Object.entries(MODEL_REGISTRY) as [ChatMode, { label: string }][]).map(([mode, config]) => (
                      <DropdownMenuItem 
                        key={mode} 
                        onClick={() => onSelectMode(mode)}
                        className="flex items-center justify-between h-10 px-3 mx-1 rounded-lg hover:bg-[var(--chat-hover)] transition-colors text-[14px] text-[var(--chat-text)] text-left cursor-pointer"
                      >
                        {config.label}
                        {selectedMode === mode && <Check className="w-4 h-4 text-[var(--chat-text)]" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenuPortal>
              </DropdownMenu>
            </PromptInputActions>

            {/* Center Zone: Spacer */}
            <div className="flex-1" />

            {/* Right Zone: Mic + Send */}
            <div className="flex items-center gap-2 shrink-0">
              {isSupported && (
               <button
                  type="button"
                  onClick={toggleRecording}
                  className={`w-10 h-10 flex items-center justify-center rounded-full chat-mic-btn ${
                    isRecording ? '!bg-red-500/20 !text-red-500 hover:!bg-red-500/30' : ''
                  }`}
                  title={isRecording ? "Stop recording" : "Start recording"}
               >
                  <Mic className={`w-5 h-5 ${isRecording ? 'animate-pulse' : ''}`} />
               </button>
              )}

              <AnimatePresence mode="wait">
                {isStreaming ? (
                  <motion.button
                    key="stop"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    type="button"
                    onClick={onStopStreaming}
                    className="w-10 h-10 flex items-center justify-center rounded-full chat-send-btn"
                  >
                    <Square className="w-4 h-4 fill-current" strokeWidth={3} />
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
                    className="w-10 h-10 flex items-center justify-center rounded-full chat-send-btn"
                  >
                    <ArrowUp className="w-5 h-5" strokeWidth={2.5} />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </PromptInputFooter>
        </PromptInput>
    </div>
  );
};
