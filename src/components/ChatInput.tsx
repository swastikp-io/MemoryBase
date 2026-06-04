import React, { useState, useRef, useEffect } from "react";
import { Plus, Mic, ArrowUp, X, Square, Image, Globe, AudioLines } from "lucide-react";
import { useSettingsStore } from "../store/settings";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "motion/react";
import { AIModel, ModelPicker } from "./ModelPicker";
import { useAccentTheme } from '../theme/useAccentTheme';
import { AccentColor } from '../theme/accentColors';
import { workspaceRoutine } from '../services/WorkspaceRoutine';
import { streamingTTS } from '../services/StreamingTTS';
import { speechQueue } from '../services/SpeechQueueManager';
import { audioSuppressionService } from '../services/audio/AudioSuppressionService';

if (typeof window !== "undefined" && window.speechSynthesis) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
}

interface ChatInputProps {
  onSendMessage: (content: string, images?: string[], searchEnabled?: boolean, fromVoice?: boolean) => void;
  onStopStreaming: () => void;
  isStreaming: boolean;
  isCentered?: boolean;
  models: AIModel[];
  selectedModelId: string;
  onSelectModel: (id: string) => void;
  onSystemCommand?: (message: string) => void;
  onCreateNewChat?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onStopStreaming,
  isStreaming,
  isCentered = false,
  models,
  selectedModelId,
  onSelectModel,
  onSystemCommand,
  onCreateNewChat
}) => {
  const { setAccent } = useAccentTheme();
  const settings = useSettingsStore();
  const [input, setInput] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [usedVoice, setUsedVoice] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const attachMenuRef = useRef<HTMLDivElement>(null);

  const handleSystemCommandWithTTS = async (message: string): Promise<void> => {
    if (onSystemCommand) {
      onSystemCommand(message);
    }
    
    if (settings.voiceExperience.autoSpeakAI) {
      speechQueue.clearQueue();
      await speechQueue.speakAndWait(message);
    }
  };

  useEffect(() => {
    workspaceRoutine.setTTSHandler(handleSystemCommandWithTTS);
  }, []);


  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (attachMenuRef.current && !attachMenuRef.current.contains(event.target as Node)) {
        setShowAttachMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 112) + "px";
    }
  }, [input]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) { }
      }
    };
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && e.metaKey && !isStreaming) {
        if (!e.repeat) {
          e.preventDefault();
          audioSuppressionService.setShortcutHeld(true);
          audioSuppressionService.suppressAudio();
          if (!isListening) toggleListening();
        }
      } else if (e.key === 'Escape' && isListening) {
        e.preventDefault();
        toggleListening();
      }
    };

    const handleGlobalKeyUp = (e: KeyboardEvent) => {
      if (audioSuppressionService.getState().isShortcutHeld) {
        if (e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') {
          e.preventDefault();
          audioSuppressionService.setShortcutHeld(false);
          audioSuppressionService.restoreAudio();
          if (isListening) toggleListening();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    window.addEventListener('keyup', handleGlobalKeyUp);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
      window.removeEventListener('keyup', handleGlobalKeyUp);
    };
  }, [isListening, isStreaming]);

  const toggleListening = async () => {
    if (isListening) {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    // Unlock speech synthesis on user interaction (required for Safari/Mobile)
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.resume();
      const unlockUtterance = new SpeechSynthesisUtterance(" ");
      window.speechSynthesis.speak(unlockUtterance);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsProcessingAudio(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64AudioMessage = reader.result?.toString().split(',')[1];
          if (!base64AudioMessage) {
            setIsProcessingAudio(false);
            return;
          }

          try {
            const { data: sessionData } = await supabase.auth.getSession();
            const accessToken = sessionData.session?.access_token || "dummy_token";

            const response = await fetch('/api/transcribe', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`
              },
              body: JSON.stringify({ audio: base64AudioMessage })
            });
            const data = await response.json();
            if (data.text) {
              const transcribedText = data.text.toLowerCase().replace(/[.,!?]/g, "").trim();
              if (transcribedText === "toggle web search") {
                setWebSearchEnabled(true);
                handleSystemCommandWithTTS("Sure, the web search feature is on.");
              } else if (transcribedText === "create a new chat") {
                if (onCreateNewChat) {
                  onCreateNewChat();
                }
              } else if (transcribedText === "hey can you please open settings") {
                window.dispatchEvent(new CustomEvent('open-settings'));
              } else if (transcribedText === "fire up the workspace for me") {
                workspaceRoutine.startRoutine();
              } else if (transcribedText === "stop workspace setup") {
                workspaceRoutine.stopRoutine();
              } else if (transcribedText === "close the settings menu") {
                window.dispatchEvent(new CustomEvent('close-settings'));
              } else if (transcribedText.startsWith("hey open gmail and draft a new message about ")) {
                const messageBody = transcribedText.replace("hey open gmail and draft a new message about ", "").trim();
                window.open(`https://mail.google.com/mail/?view=cm&fs=1&body=${encodeURIComponent(messageBody)}`, "_blank");
              } else if (transcribedText === "hey open gmail and draft a new message") {
                window.open("https://mail.google.com/mail/u/0/#inbox?compose=new", "_blank");
              } else if (transcribedText === "hey open gmail") {
                window.open("https://mail.google.com", "_blank");
              } else if (/^(?:open youtube and )?play (.+?)(?: on youtube)?$/i.test(transcribedText)) {
                const match = transcribedText.match(/^(?:open youtube and )?play (.+?)(?: on youtube)?$/i);
                if (match && match[1]) {
                  const query = match[1].trim();
                  handleSystemCommandWithTTS(`Playing ${query} on YouTube.`);
                  
                  try {
                    const { data: sessionData } = await supabase.auth.getSession();
                    const intentToken = sessionData.session?.access_token || "dummy_token";
                    
                    fetch('/api/browser/intent', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${intentToken}`
                      },
                      body: JSON.stringify({
                        intent: {
                          action: "play_youtube",
                          query
                        }
                      })
                    }).then(async res => {
                      const result = await res.json();
                      if (result.success) {
                        handleSystemCommandWithTTS(result.message || "Your video is now playing.");
                        if (result.url) {
                          window.open(result.url, "_blank");
                        }
                      } else {
                        handleSystemCommandWithTTS(result.message || "I found YouTube results but couldn't start playback automatically.");
                      }
                    }).catch(e => {
                      handleSystemCommandWithTTS("I encountered an error trying to play YouTube.");
                    });
                  } catch (e) { }
                }
              } else if (/^(?:open linkedin and search for) (.+)$/i.test(transcribedText)) {
                const match = transcribedText.match(/^(?:open linkedin and search for) (.+)$/i);
                if (match && match[1]) {
                  const query = match[1].trim();
                  handleSystemCommandWithTTS(`Searching LinkedIn for "${query}".`);
                  
                  try {
                    const { data: sessionData } = await supabase.auth.getSession();
                    const intentToken = sessionData.session?.access_token || "dummy_token";
                    
                    fetch('/api/browser/intent', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${intentToken}`
                      },
                      body: JSON.stringify({
                        intent: {
                          action: "search_linkedin",
                          query
                        }
                      })
                    }).then(async res => {
                      const result = await res.json();
                      if (result.success && result.url) {
                        handleSystemCommandWithTTS(result.message || "Opening LinkedIn search.");
                        window.open(result.url, "_blank");
                      } else {
                        handleSystemCommandWithTTS(result.message || "Failed to search LinkedIn.");
                      }
                    }).catch(e => {
                      handleSystemCommandWithTTS("I encountered an error trying to search LinkedIn.");
                    });
                  } catch (e) { }
                }
              } else if (/^(?:lower|reduce|decrease|turn)\s+(?:the\s+)?(?:system\s+)?(?:volume|sound)(?:\s+down)?\s+by\s+(\d+)\s*(?:percent|%|)$/i.test(transcribedText)) {
                const match = transcribedText.match(/^(?:lower|reduce|decrease|turn)\s+(?:the\s+)?(?:system\s+)?(?:volume|sound)(?:\s+down)?\s+by\s+(\d+)\s*(?:percent|%|)$/i);
                if (match && match[1]) {
                  const percentage = parseInt(match[1], 10);
                  
                  try {
                    const { data: sessionData } = await supabase.auth.getSession();
                    const intentToken = sessionData.session?.access_token || "dummy_token";
                    
                    fetch('/api/system/intent', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${intentToken}`
                      },
                      body: JSON.stringify({
                        intent: {
                          action: "system_volume_decrease",
                          percentage
                        }
                      })
                    }).then(async res => {
                      if (!res.ok) {
                        handleSystemCommandWithTTS("I encountered an error trying to adjust the system volume.");
                        return;
                      }
                      const result = await res.json();
                      if (result.message) {
                        handleSystemCommandWithTTS(result.message);
                      }
                    }).catch(e => {
                      handleSystemCommandWithTTS("I encountered an error trying to adjust the system volume.");
                    });
                  } catch (e) { }
                }
              } else if (/^(?:increase|raise|turn|make|boost)\s+(?:the\s+)?(?:system\s+)?(?:volume|sound)(?:\s+(?:up|louder))?\s+by\s+(\d+)\s*(?:percent|%|)$/i.test(transcribedText)) {
                const match = transcribedText.match(/^(?:increase|raise|turn|make|boost)\s+(?:the\s+)?(?:system\s+)?(?:volume|sound)(?:\s+(?:up|louder))?\s+by\s+(\d+)\s*(?:percent|%|)$/i);
                if (match && match[1]) {
                  const percentage = parseInt(match[1], 10);
                  
                  try {
                    const { data: sessionData } = await supabase.auth.getSession();
                    const intentToken = sessionData.session?.access_token || "dummy_token";
                    
                    fetch('/api/system/intent', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${intentToken}`
                      },
                      body: JSON.stringify({
                        intent: {
                          action: "system_volume_increase",
                          percentage
                        }
                      })
                    }).then(async res => {
                      if (!res.ok) {
                        handleSystemCommandWithTTS("I encountered an error trying to adjust the system volume.");
                        return;
                      }
                      const result = await res.json();
                      if (result.message) {
                        handleSystemCommandWithTTS(result.message);
                      }
                    }).catch(e => {
                      handleSystemCommandWithTTS("I encountered an error trying to adjust the system volume.");
                    });
                  } catch (e) { }
                }
              } else if (
                transcribedText.startsWith("hey can you please open the settings and change the accent color to") ||
                transcribedText.startsWith("hey can you please change the accent color to")
              ) {
                let colorStr = "";
                if (transcribedText.startsWith("hey can you please open the settings and change the accent color to")) {
                  colorStr = transcribedText.replace("hey can you please open the settings and change the accent color to", "").trim();
                } else {
                  colorStr = transcribedText.replace("hey can you please change the accent color to", "").trim();
                }

                let matchedColor: AccentColor | null = null;
                if (colorStr === "blue") matchedColor = "blue";
                else if (colorStr === "light blue") matchedColor = "lightBlue";
                else if (colorStr === "green") matchedColor = "green";
                else if (colorStr === "soft blue") matchedColor = "cornflower";
                else if (colorStr === "lime") matchedColor = "lime";

                if (matchedColor) {
                  window.dispatchEvent(new CustomEvent('open-settings'));
                  setTimeout(() => {
                    setAccent(matchedColor as AccentColor);
                  }, 800);
                  setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('close-settings'));
                  }, 2000);
                } else if (transcribedText === "enable voice mode") {
                  settings.updateVoiceExperience({ autoSendSpeech: true, autoSpeakAI: true });
                  handleSystemCommandWithTTS("Voice mode enabled.");
                } else if (transcribedText === "disable voice mode" || transcribedText === "exit voice mode") {
                  settings.updateVoiceExperience({ autoSendSpeech: false, autoSpeakAI: false });
                  handleSystemCommandWithTTS("Voice mode disabled.");
                } else if (transcribedText === "mute responses" || transcribedText === "stop speaking") {
                  settings.updateVoiceExperience({ autoSpeakAI: false });
                  streamingTTS.stop();
                  if (onSystemCommand) onSystemCommand("Voice responses muted.");
                } else if (transcribedText === "resume voice responses") {
                  settings.updateVoiceExperience({ autoSpeakAI: true });
                  handleSystemCommandWithTTS("Voice responses resumed.");
                } else {
                  setUsedVoice(true);
                  if (settings.voiceExperience.autoSendSpeech) {
                    onSendMessage(data.text, [], webSearchEnabled, true);
                  } else {
                    setInput((prev) => {
                      const space = prev.length > 0 && !prev.endsWith(' ') ? ' ' : '';
                      return prev + space + data.text;
                    });
                  }
                }
              } else {
                setUsedVoice(true);
                if (settings.voiceExperience.autoSendSpeech) {
                  onSendMessage(data.text, [], webSearchEnabled, true);
                } else {
                  setInput((prev) => {
                    const space = prev.length > 0 && !prev.endsWith(' ') ? ' ' : '';
                    return prev + space + data.text;
                  });
                }
              }
            }
          } catch (e) {
            console.error("Transcription request failed", e);
          } finally {
            setIsProcessingAudio(false);
          }
        };

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsListening(true);
    } catch (err) {
      console.error("Failed to start speech recognition", err);
      alert('Microphone access was denied or is not supported. Please allow microphone permissions in your browser.');
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isListening) {
      mediaRecorderRef.current?.stop();
      setIsListening(false);
    }
    if ((input.trim() || images.length > 0) && !isStreaming) {
      onSendMessage(input.trim(), images.length > 0 ? images : undefined, webSearchEnabled, usedVoice);
      setInput("");
      setImages([]);
      setUsedVoice(false);
      setWebSearchEnabled(false);
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
    <div className={`absolute left-0 right-0 bg-transparent px-3 pointer-events-none md:px-5 transition-all duration-500 ease-in-out z-20 ${
      isCentered ? 'top-1/2 -translate-y-1/2 pb-5 pt-0 -mt-4' : 'bottom-0 pb-5 pt-2 md:pb-5'
    }`}>
      <div className="max-w-[768px] mx-auto w-full relative pointer-events-auto">
        <motion.form
          layout
          initial={{ borderRadius: 9999 }}
          onSubmit={handleSubmit}
          className={`flex items-center bg-[#212121] px-3 py-2 transition-colors duration-300 ${
            isListening ? 'shadow-[0_0_15px_rgba(239,68,68,0.15)]' : ''
          }`}
          style={{ borderRadius: 9999 }}
        >
          <div className="flex-shrink-0 flex items-center justify-center text-text-primary px-2">
            <Plus className="w-[22px] h-[22px] text-[#A0A0A0]" strokeWidth={1.5} />
          </div>

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
            placeholder={isListening ? "Listening..." : ""}
            className={`flex-1 bg-transparent resize-none border-none focus:ring-0 text-text-primary py-2 px-2 text-[15px] outline-none scrollbar-hide h-[40px] flex items-center ${
              isListening ? 'placeholder-red-500' : 'placeholder-[#A0A0A0]'
            }`}
            rows={1}
            disabled={isStreaming}
            style={{ minHeight: '40px', paddingTop: '10px' }}
          />

          <div className="flex-shrink-0 flex items-center justify-center px-1">
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
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  type="submit"
                  disabled={isStreaming}
                  className="w-[34px] h-[34px] flex items-center justify-center rounded-full bg-[var(--accent-primary)] text-[var(--accent-fg)] transition-colors hover:opacity-90"
                >
                  <ArrowUp className="w-5 h-5" strokeWidth={2.5} />
                </motion.button>
              ) : (
                <motion.button
                  key="mic"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  type="button"
                  onClick={toggleListening}
                  disabled={isProcessingAudio}
                  className={`w-[34px] h-[34px] flex items-center justify-center rounded-full transition-colors ${
                    isProcessingAudio ? 'opacity-50 cursor-not-allowed text-text-secondary bg-[#333]' :
                    isListening ? 'bg-red-500 text-white' : 'bg-[var(--accent-primary)] text-[var(--accent-fg)] hover:opacity-90'
                  }`}
                >
                  {isProcessingAudio ? (
                    <div className="w-4 h-4 border-2 border-text-secondary border-t-transparent rounded-full animate-spin" />
                  ) : isListening ? (
                    <Square className="w-4 h-4 fill-current" />
                  ) : (
                    <AudioLines className="w-[18px] h-[18px]" strokeWidth={2} />
                  )}
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </motion.form>
      </div>
    </div>
  );
};
