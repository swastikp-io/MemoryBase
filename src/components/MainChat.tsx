import React, { useState, useRef, useEffect } from "react";
import { WelcomeScreen } from "./WelcomeScreen";
import { ChatInput } from "./ChatInput";
import { ChatMessage } from "./ChatMessage";
import { Message } from "../store/chatStore";
import { useChatStore } from "../store/chatStore";
import { useSettingsStore } from "../store/settings";
import { useAuthStore } from "../store/auth";
import { DocumentOutline } from "./markdown/DocumentOutline";
import { ChatMode } from "../lib/models/modes";

export const MainChat: React.FC = () => {
  const { chats, activeChatId, messages: currentMessages, loadChat, createChat, saveMessage, addMessageOptimistic, updateMessageContent, renameChat, updateChatMode } = useChatStore();
  const settings = useSettingsStore();
  const { token } = useAuthStore();
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedMode, setSelectedMode] = useState<ChatMode>('standard');

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
                  updateMessageContent(modelMessageId, "", false, true);
                }
                if (data.text) {
                  fullResponse += data.text;
                  updateMessageContent(modelMessageId, data.text, true, false);
                } else if (data.error) {
                  updateMessageContent(modelMessageId, "\n\n**Error:** " + data.error, true);
                }
                if (data.reasoning) {
                  updateMessageContent(modelMessageId, "", false, undefined, data.reasoning);
                }
                if (data.research) {
                  updateMessageContent(modelMessageId, "", false, undefined, undefined, data.research);
                }
                if (data.sources) {
                  updateMessageContent(modelMessageId, "", false, false, undefined, undefined, data.sources);
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
          updateMessageContent(modelMessageId, "", false, undefined, undefined, { status: 'cancelled' });
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
    
    // Optimistic UI update
    addMessageOptimistic(newUserMessage);
    
    // Save to DB
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

  const latestModelMessage = currentMessages
    .filter(m => m.role === 'model')
    .slice(-1)[0];
  const outlineContent = latestModelMessage ? latestModelMessage.content : '';



  return (
    <>
      {outlineContent && <DocumentOutline content={outlineContent} />}

      <div 
        id="chat-scroll-container"
        className="flex-1 overflow-y-auto pt-4 flex flex-col relative w-full scrollbar-thin scrollbar-thumb-border-color hover:scrollbar-thumb-text-secondary"
        style={{ paddingBottom: 'calc(var(--input-height, 120px) + 40px + env(safe-area-inset-bottom))' }}
      >
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
                reasoning={msg.reasoning}
                research={msg.research}
                sources={msg.sources}
                mode={selectedMode}
                onEdit={isStreaming ? undefined : handleEditMessage}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <ChatInput
        onSendMessage={handleSendMessage}
        onStopStreaming={stopStreaming}
        isStreaming={isStreaming}
        isCentered={currentMessages.length === 0}
        selectedMode={selectedMode}
        onSelectMode={handleSelectMode}
      />
    </>
  );
};
