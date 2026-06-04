import React, { useState, useRef, useEffect } from "react";
import { WelcomeScreen } from "./WelcomeScreen";
import { ChatInput } from "./ChatInput";
import { ChatMessage } from "./ChatMessage";
import { useChat, Message } from "../context/ChatContext";
import { useSettingsStore } from "../store/settings";
import { ChevronDown, Check, VolumeX } from "lucide-react";
import { supabase } from "../lib/supabase";
import { ModelPicker, AIModel } from "./ModelPicker";
import { DocumentOutline } from "./markdown/DocumentOutline";
import { streamingTTS } from '../services/StreamingTTS';
import { speechQueue } from '../services/SpeechQueueManager';

export const MainChat: React.FC = () => {
  const { chats, currentChatId, currentMessages, addMessage, updateModelMessage, updateChatModel, updateChatTitle, editAndTruncateAndAddMessage, createNewChat } = useChat();
  const settings = useSettingsStore();
  const [isStreaming, setIsStreaming] = useState(false);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);

  const [aiModels, setAiModels] = useState<AIModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState('fast-answers');
  const [voiceMode, setVoiceMode] = useState(false);

  useEffect(() => {
    const fetchModels = async () => {
      const { data } = await supabase.from('ai_models').select('*').eq('active', true).order('id');
      if (data && data.length > 0) {
        setAiModels(data);
      }
    };
    fetchModels();
  }, []);

  useEffect(() => {
    const currentChat = chats.find(c => c.id === currentChatId);
    if (currentChat?.modelId) {
      setSelectedModelId(currentChat.modelId);
    }
  }, [currentChatId, chats]);

  const handleSelectModel = (id: string) => {
    setSelectedModelId(id);
    if (currentChatId) {
      updateChatModel(currentChatId, id);
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsModelSelectorOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift" && speechQueue.isSpeaking()) {
        settings.updateVoiceExperience({ autoSpeakAI: false });
        speechQueue.clearQueue();
        
        const modelMessageId = Date.now().toString();
        const newModelMessage: Message = { id: modelMessageId, role: "model", content: "Voice responses muted." };
        addMessage(newModelMessage, currentChatId || undefined);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [settings, addMessage, currentChatId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentMessages]);

  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  };



  const streamResponse = async (messages: Message[], activeChatId: string, modelMessageId: string, searchWeb: boolean = false, useVoiceResponse: boolean = false, isFirstMessage: boolean = false) => {
    if (useVoiceResponse && settings.voiceExperience.autoSpeakAI) {
      streamingTTS.stop();
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setIsStreaming(true);
    let fullResponse = "";

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token || "dummy_token";

      const currentModel = aiModels.find(m => m.id === selectedModelId) || aiModels[0];
      const modelToUse = currentModel ? currentModel.model_name : 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free';

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        signal: abortController.signal,
        body: JSON.stringify({
          messages: messages,
          model: modelToUse,
          searchWeb: searchWeb,
          openRouterApiKey: settings.aiBehavior.openRouterApiKey,
        }),
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let buffer = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;

        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.trim() === "") continue;
            if (line.startsWith("data: ")) {
              const dataStr = line.replace("data: ", "");
              if (dataStr.trim() === "[DONE]") {
                done = true;
                break;
              }
              try {
                const data = JSON.parse(dataStr);
                if (data.isSearchingWeb) {
                  updateModelMessage(activeChatId, modelMessageId, "", false, true);
                }
                if (data.text) {
                  console.log(JSON.stringify(data.text));
                  fullResponse += data.text;
                  updateModelMessage(activeChatId, modelMessageId, data.text, true);
                  
                  if (useVoiceResponse && settings.voiceExperience.autoSpeakAI && settings.voiceExperience.streamingVoice) {
                    streamingTTS.queueChunk(data.text);
                  }
                } else if (data.error) {
                  updateModelMessage(activeChatId, modelMessageId, "\n\n**Error:** " + data.error, true);
                }
              } catch (e) {
                // Parse error
              }
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        updateModelMessage(activeChatId, modelMessageId, "\n\n*Generation stopped.*", true);
      } else {
        updateModelMessage(activeChatId, modelMessageId, "\n\n*Error: Could not reach the server.*", true);
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
      
      if (useVoiceResponse && settings.voiceExperience.autoSpeakAI) {
        if (!settings.voiceExperience.streamingVoice) {
          streamingTTS.queueChunk(fullResponse);
        }
        streamingTTS.flush();
      }

      if (isFirstMessage) {
        const userMsg = messages.find(m => m.role === 'user')?.content || "";
        generateTitle(activeChatId, userMsg, fullResponse).catch(console.error);
      }
    }
  };

  const handleSendMessage = async (content: string, images?: string[], searchWeb: boolean = false, fromVoice: boolean = false) => {
    const isVoiceTurn = fromVoice || (voiceMode && settings.voiceExperience.keepVoiceMode);
    if (fromVoice && settings.voiceExperience.keepVoiceMode) {
      setVoiceMode(true);
    } else if (!fromVoice) {
      setVoiceMode(false);
    }

    const newUserMessage: Message = { 
      id: Date.now().toString(), 
      role: "user", 
      content, 
      images,
      source: fromVoice ? "voice" : "text",
      autoSent: fromVoice
    };
    const activeChatId = addMessage(newUserMessage, undefined, undefined, selectedModelId);

    const modelMessageId = (Date.now() + 1).toString();
    const newModelMessage: Message = { id: modelMessageId, role: "model", content: "" };
    addMessage(newModelMessage, activeChatId);

    const messagesToSend = [...currentMessages.filter(m => m.role !== 'system'), newUserMessage];
    await streamResponse(messagesToSend, activeChatId, modelMessageId, searchWeb, isVoiceTurn, currentMessages.length === 0);
  };

  const handleSystemCommand = (message: string) => {
    const modelMessageId = Date.now().toString();
    const newModelMessage: Message = { id: modelMessageId, role: "model", content: message };
    addMessage(newModelMessage, currentChatId || undefined);
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!currentChatId || isStreaming) return;

    const modelMessageId = (Date.now() + 1).toString();
    const newModelMessage: Message = { id: modelMessageId, role: "model", content: "" };

    // Truncate the chat state locally, update the edited message, and append the new model message atomically
    editAndTruncateAndAddMessage(currentChatId, messageId, newContent, newModelMessage);

    // We must manually prepare the truncated array to send to the API because setChats is async
    const messageIndex = currentMessages.findIndex(m => m.id === messageId);
    const sliced = currentMessages.slice(0, messageIndex + 1);
    const messagesToSend = sliced.filter(m => m.role !== 'system').map(m => m.id === messageId ? { ...m, content: newContent } : m);

    await streamResponse(messagesToSend, currentChatId, modelMessageId, false);
  };

  const generateTitle = async (chatId: string, userMessage: string, assistantResponse: string) => {
    try {
      const currentChat = chats.find(c => c.id === chatId);
      if (!currentChat || currentChat.isTitleGenerated || currentChat.isCustomTitle) return;

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token || "dummy_token";
      const currentModel = aiModels.find(m => m.id === selectedModelId) || aiModels[0];
      const modelToUse = currentModel ? currentModel.model_name : 'openrouter/free';

      const prompt = `Generate a concise conversation title.

Rules:
- 3 to 8 words.
- No quotation marks.
- No punctuation at the end.
- Use title case.
- Summarize the main topic.
- Return only the title.

Conversation:
User: ${userMessage}
Assistant: ${assistantResponse}`;

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          messages: [
            { role: "user", content: prompt }
          ],
          model: modelToUse,
          searchWeb: false,
          openRouterApiKey: settings.aiBehavior.openRouterApiKey,
        }),
      });

      if (!response.body) throw new Error("No response body");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let generatedTitle = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.replace("data: ", "");
              if (dataStr.trim() === "[DONE]") {
                done = true;
                break;
              }
              try {
                const data = JSON.parse(dataStr);
                if (data.text) {
                  generatedTitle += data.text;
                }
              } catch (e) { }
            }
          }
        }
      }

      if (generatedTitle.trim()) {
        const cleanTitle = generatedTitle.replace(/["']/g, '').trim().replace(/\.$/, '');
        updateChatTitle(chatId, cleanTitle, true, false);
      } else {
        throw new Error("Empty generated title");
      }
    } catch (e) {
      console.error("Auto-rename failed", e);
      // Fallback
      let fallbackTitle = userMessage.trim();
      if (fallbackTitle.length > 30) {
        fallbackTitle = fallbackTitle.slice(0, 30) + '...';
      }
      updateChatTitle(chatId, fallbackTitle, true, false);
    }
  };

  const latestModelMessage = currentMessages
    .filter(m => m.role === 'model')
    .slice(-1)[0];
  const outlineContent = latestModelMessage ? latestModelMessage.content : '';

  return (
    <>
      {outlineContent && <DocumentOutline content={outlineContent} />}
      <div 
        className="absolute top-4 z-30 transition-all duration-300"
        style={{ left: 'var(--model-picker-left, 1.5rem)' }}
      >
        <ModelPicker 
          models={aiModels} 
          selectedModelId={selectedModelId} 
          onSelectModel={handleSelectModel} 
        />
      </div>
      <div className="flex-1 overflow-y-auto pt-4 pb-32 flex flex-col relative w-full scrollbar-thin scrollbar-thumb-border-color hover:scrollbar-thumb-text-secondary">
        {currentMessages.length === 0 ? (
          <WelcomeScreen />
        ) : (
          <div className="flex flex-col w-full pb-8">
            {currentMessages.filter(msg => msg.role !== 'system').map((msg, index, arr) => (
              <ChatMessage
                key={msg.id}
                id={msg.id}
                role={msg.role as "user" | "model"}
                content={msg.content}
                images={msg.images}
                isGenerating={isStreaming && index === arr.length - 1 && msg.role === "model"}
                isSearchingWeb={msg.isSearchingWeb}
                onEdit={isStreaming ? undefined : handleEditMessage}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Floating Stop TTS button removed */}

      <ChatInput
        onSendMessage={handleSendMessage}
        onStopStreaming={stopStreaming}
        isStreaming={isStreaming}
        isCentered={currentMessages.length === 0}
        models={aiModels}
        selectedModelId={selectedModelId}
        onSelectModel={handleSelectModel}
        onSystemCommand={handleSystemCommand}
        onCreateNewChat={createNewChat}
      />
    </>
  );
};
