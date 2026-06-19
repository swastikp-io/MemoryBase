import React, { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { ChatLandingPage } from "./chat/ChatLandingPage";
import { ChatPromptInput as ChatInput } from "./chat/ChatPromptInput";
import { ChatMessage } from "./ChatMessage";
import { Message } from "../store/chatStore";
import { useChatStore } from "../store/chatStore";
import { useReasoningStore } from "../store/reasoningStore";
import { useSettingsStore } from "../store/settings";


import { ChatMode } from "../lib/models/modes";

export const MainChat: React.FC = () => {
  const { chats, activeChatId, messages: currentMessages, loadChat, createChat, saveMessage, addMessageOptimistic, updateMessageContent, renameChat, updateChatMode } = useChatStore();
  const { addStep, updateStep, clearSteps } = useReasoningStore();
  const settings = useSettingsStore();
  const token = "mock-token";
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedMode, setSelectedMode] = useState<ChatMode>('standard');
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [pendingResearchPlan, setPendingResearchPlan] = useState<any | null>(null);
  const [pendingResearchParams, setPendingResearchParams] = useState<any>(null);

  useEffect(() => {
    const inputContainer = document.getElementById('chat-input-container');
    if (!inputContainer) return;
    
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        document.documentElement.style.setProperty('--input-height', `${entry.contentRect.height}px`);
      }
    });
    
    observer.observe(inputContainer);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const currentChat = chats.find(c => c.id === activeChatId);
    if (currentChat?.mode) {
      setSelectedMode(currentChat.mode as ChatMode);
    } else {
      setSelectedMode('standard');
    }
  }, [activeChatId, chats]);

  const handleSelectMode = (mode: ChatMode) => {
    setSelectedMode(mode);
    if (activeChatId) {
      updateChatMode(activeChatId, mode);
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);



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

  useEffect(() => {
    const handleAbort = () => stopStreaming();
    window.addEventListener('abort-research', handleAbort);
    return () => window.removeEventListener('abort-research', handleAbort);
  }, []);



  const streamResponse = async (messages: Message[], activeChatId: string, modelMessageId: string, isFirstMessage: boolean = false, webSearchEnabled: boolean = false) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setIsStreaming(true);
    clearSteps();
    let fullResponse = "";

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        signal: abortController.signal,
        body: JSON.stringify({
          messages: messages,
          mode: selectedMode,
          webSearch: webSearchEnabled,
        }),
      });

      if (!response.body) throw new Error("No response body");

      let connectionTimeout = setTimeout(() => {
        abortController.abort(new Error("timeout"));
      }, 30000);

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
                
                // Clear timeout once we receive any valid data from the server
                if (connectionTimeout) {
                  clearTimeout(connectionTimeout);
                  connectionTimeout = null as any;
                }

                if (data.status === "connected") {
                  console.log("Connected to stream.");
                  continue;
                }
                
                if (data.isSearchingWeb) {
                  updateMessageContent(modelMessageId, "", true, true);
                }
                if (data.text) {
                  fullResponse += data.text;
                  updateMessageContent(modelMessageId, data.text, true, false);
                } else if (data.error) {
                  updateMessageContent(modelMessageId, "\n\n**Error:** " + data.error, true);
                }
                if (data.reasoning) {
                  updateMessageContent(modelMessageId, "", true, undefined, data.reasoning);
                }
                if (data.reasoningStep) {
                  const currentState = useReasoningStore.getState();
                  const exists = currentState.steps.some(e => e.id === data.reasoningStep.id);
                  if (exists) {
                    updateStep(data.reasoningStep.id, data.reasoningStep);
                  } else {
                    addStep(data.reasoningStep);
                  }
                  // sync to message
                  updateMessageContent(modelMessageId, "", true, undefined, undefined, undefined, undefined, useReasoningStore.getState().steps);
                }
                if (data.research) {
                  updateMessageContent(modelMessageId, "", true, undefined, undefined, data.research);
                }
                if (data.sources) {
                  updateMessageContent(modelMessageId, "", true, false, undefined, undefined, data.sources);
                }
              } catch (e) {
              }
            }
          }
        }
      }
      
      // Save assistant message to DB
      await saveMessage(activeChatId, 'model', fullResponse);
      
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
      }
      
    } catch (error: any) {
      if (error.name === "AbortError" && error.message === "timeout") {
        updateMessageContent(modelMessageId, "\n\n*The AI provider did not respond in time.*", true);
      } else if (error.name === "AbortError") {
        updateMessageContent(modelMessageId, "\n\n*Generation stopped.*", true);
        if (selectedMode === 'research') {
          updateMessageContent(modelMessageId, "", true, undefined, undefined, { status: 'cancelled' });
        }
      } else if (error.message === "No response body" || error.message.includes("fetch")) {
        updateMessageContent(modelMessageId, "\n\n*Connection lost. Please retry.*", true);
      } else {
        updateMessageContent(modelMessageId, "\n\n*Error: Could not reach the server.*", true);
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
      


      if (isFirstMessage) {
        const userMsg = messages.find(m => m.role === 'user')?.content || "";
        generateTitle(activeChatId, userMsg).catch(console.error);
      }
    }
  };

  const handleSendMessage = async (content: string, images?: string[], webSearchEnabled?: boolean) => {
    if (selectedMode === 'research') {
      setIsGeneratingPlan(true);
      try {
        const response = await fetch("/api/research/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: content })
        });
        if (!response.ok) throw new Error("Failed to generate plan");
        const plan = await response.json();
        setPendingResearchPlan(plan);
        setPendingResearchParams({ content, images, webSearchEnabled });
        
        // Execute the message immediately after generating the plan 
        // since the plan approval UI is currently missing
        executeNormalMessage(content, images, webSearchEnabled);
      } catch (e) {
        console.error(e);
        // Fallback to normal execution if planning fails
        executeNormalMessage(content, images, webSearchEnabled);
      } finally {
        setIsGeneratingPlan(false);
      }
      return;
    }

    executeNormalMessage(content, images, webSearchEnabled);
  };

  const executeNormalMessage = async (content: string, images?: string[], webSearchEnabled?: boolean) => {
    let chatIdToUse = activeChatId;
    
    if (!chatIdToUse) {
      chatIdToUse = await createChat(selectedMode);
      if (!chatIdToUse) {
        console.error("Failed to create chat");
        return;
      }
    }

    const newUserMessage: Message = { 
      id: Date.now().toString(), 
      role: "user", 
      content, 
      images,
      webSearchUsed: webSearchEnabled
    };
    
    addMessageOptimistic(newUserMessage);
    await saveMessage(chatIdToUse, 'user', content, webSearchEnabled);

    const modelMessageId = (Date.now() + 1).toString();
    const newModelMessage: Message = { id: modelMessageId, role: "model", content: "" };
    addMessageOptimistic(newModelMessage);

    const messagesToSend = [...currentMessages.filter(m => m.role !== 'system'), newUserMessage];
    await streamResponse(messagesToSend, chatIdToUse, modelMessageId, currentMessages.length === 0, webSearchEnabled);
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!activeChatId || isStreaming) return;

    // This would require a DB update, but for now we fallback or skip
    console.warn("Edit message requires complex DB sync - skipping for V2");
  };

  const generateTitle = async (chatId: string, userMessage: string) => {
    try {
      console.log("Generating title for message:", userMessage);
      const cleanMsg = userMessage.trim();
      if (cleanMsg.length <= 10) {
        console.log("Message too short, skipping title generation.");
        return;
      }

      console.log("Fetching /api/chat/title...");
      const response = await fetch("/api/chat/title", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstMessage: cleanMsg,
          mode: selectedMode,
        }),
      });

      console.log("Response status:", response.status);
      if (!response.ok) {
        const fallbackWords = cleanMsg.split(" ").slice(0, 5).join(" ");
        if (fallbackWords) renameChat(chatId, fallbackWords);
        return;
      }

      const data = await response.json();
      console.log("Generated Title Data:", data);
      const cleanTitle = data.title;

      if (cleanTitle && cleanTitle !== "New Chat") {
        renameChat(chatId, cleanTitle);
      } else {
        const fallbackWords = cleanMsg.split(" ").slice(0, 5).join(" ");
        if (fallbackWords) renameChat(chatId, fallbackWords);
      }
    } catch (error) {
      console.error("Failed to generate title:", error);
      const fallbackWords = userMessage.trim().split(" ").slice(0, 5).join(" ");
      if (fallbackWords) renameChat(chatId, fallbackWords);
    }
  };

  return (
    <div className="flex w-full h-full relative overflow-hidden">
      {/* Main Content Area */}
      <div className="flex-1 relative flex flex-col min-w-0">
        {currentMessages.length === 0 ? (
          <div className="flex-1 overflow-y-auto">
            <ChatLandingPage onSelectSuggestion={(suggestion) => handleSendMessage(suggestion)}>
              <motion.div layoutId="prompt-input-container" className="w-full">
                <ChatInput isGeneratingPlan={isGeneratingPlan}
                  onSendMessage={handleSendMessage}
                  onStopStreaming={stopStreaming}
                  isStreaming={isStreaming}
                  selectedMode={selectedMode}
                  onSelectMode={handleSelectMode}
                />
              </motion.div>
            </ChatLandingPage>
          </div>
        ) : (
          <>
            <div 
              id="chat-scroll-container"
              className="flex-1 overflow-y-auto pt-4 flex flex-col relative w-full scrollbar-thin scrollbar-thumb-border-color hover:scrollbar-thumb-text-secondary"
            >
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
                    reasoning={msg.reasoning}
                    reasoningSteps={msg.reasoningSteps}
                    research={msg.research}
                    sources={msg.sources}
                    mode={selectedMode}
                    onEdit={isStreaming ? undefined : handleEditMessage}
                  />
                ))}
                {/* Spacer to prevent content from hiding behind the absolute chat input */}
                <div style={{ height: 'calc(var(--input-height, 120px) + 40px + env(safe-area-inset-bottom))' }} className="w-full flex-shrink-0" />
                <div ref={messagesEndRef} />
              </div>
            </div>

            <motion.div layoutId="prompt-input-container" className="absolute left-0 right-0 bottom-0 pb-5 pt-2 z-20 pointer-events-none px-3 md:px-5">
              <div className="max-w-[800px] mx-auto w-full">
                <ChatInput isGeneratingPlan={isGeneratingPlan}
                  onSendMessage={handleSendMessage}
                  onStopStreaming={stopStreaming}
                  isStreaming={isStreaming}
                  selectedMode={selectedMode}
                  onSelectMode={handleSelectMode}
                />
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
};
