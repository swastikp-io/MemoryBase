import React, { useState, useRef, useEffect } from "react";
import { WelcomeScreen } from "./WelcomeScreen";
import { ChatInput } from "./ChatInput";
import { ChatMessage } from "./ChatMessage";
import { useChat, Message } from "../context/ChatContext";
import { useSettingsStore } from "../store/settings";
import { DocumentOutline } from "./markdown/DocumentOutline";


export const MainChat: React.FC = () => {
  const { chats, currentChatId, currentMessages, addMessage, updateModelMessage, updateChatModel, updateChatTitle, updateReasoningState, editAndTruncateAndAddMessage, createNewChat } = useChat();
  const settings = useSettingsStore();
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedMode, setSelectedMode] = useState<'research' | 'reasoning' | 'coding'>('research');

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
    const currentChat = chats.find(c => c.id === currentChatId);
    if (currentChat?.modelId && (currentChat.modelId === 'research' || currentChat.modelId === 'reasoning' || currentChat.modelId === 'coding')) {
      setSelectedMode(currentChat.modelId as 'research' | 'reasoning' | 'coding');
    }
  }, [currentChatId, chats]);

  const handleSelectMode = (mode: 'research' | 'reasoning' | 'coding') => {
    setSelectedMode(mode);
    if (currentChatId) {
      updateChatModel(currentChatId, mode);
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



  const streamResponse = async (messages: Message[], activeChatId: string, modelMessageId: string, isFirstMessage: boolean = false) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setIsStreaming(true);
    let fullResponse = "";

    try {
      const accessToken = "dummy_token";

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        signal: abortController.signal,
        body: JSON.stringify({
          messages: messages,
          model: selectedMode,
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
                  

                } else if (data.error) {
                  updateModelMessage(activeChatId, modelMessageId, "\n\n**Error:** " + data.error, true);
                }
                if (data.reasoning) {
                  updateReasoningState(activeChatId, modelMessageId, data.reasoning);
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
      


      if (isFirstMessage) {
        const userMsg = messages.find(m => m.role === 'user')?.content || "";
        generateTitle(activeChatId, userMsg).catch(console.error);
      }
    }
  };

  const handleSendMessage = async (content: string, images?: string[]) => {
    const newUserMessage: Message = { 
      id: Date.now().toString(), 
      role: "user", 
      content, 
      images
    };
    const activeChatId = addMessage(newUserMessage, undefined, undefined, selectedMode);

    const modelMessageId = (Date.now() + 1).toString();
    const newModelMessage: Message = { id: modelMessageId, role: "model", content: "" };
    addMessage(newModelMessage, activeChatId);

    const messagesToSend = [...currentMessages.filter(m => m.role !== 'system'), newUserMessage];
    await streamResponse(messagesToSend, activeChatId, modelMessageId, currentMessages.length === 0);
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
          Authorization: `Bearer dummy_token`,
        },
        body: JSON.stringify({
          firstMessage: cleanMsg,
          model: selectedMode,
        }),
      });

      console.log("Response status:", response.status);
      if (!response.ok) {
        const fallbackWords = cleanMsg.split(" ").slice(0, 5).join(" ");
        if (fallbackWords) updateChatTitle(chatId, fallbackWords, true, false);
        return;
      }

      const data = await response.json();
      console.log("Generated Title Data:", data);
      const cleanTitle = data.title;

      if (cleanTitle && cleanTitle !== "New Chat") {
        updateChatTitle(chatId, cleanTitle, true, false);
      } else {
        const fallbackWords = cleanMsg.split(" ").slice(0, 5).join(" ");
        if (fallbackWords) updateChatTitle(chatId, fallbackWords, true, false);
      }
    } catch (error) {
      console.error("Failed to generate title:", error);
      const fallbackWords = userMessage.trim().split(" ").slice(0, 5).join(" ");
      if (fallbackWords) updateChatTitle(chatId, fallbackWords, true, false);
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
        style={{ paddingBottom: 'calc(var(--input-height, 120px) + 20px + env(safe-area-inset-bottom))' }}
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
                onEdit={isStreaming ? undefined : handleEditMessage}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div id="chat-input-container">
        <ChatInput
          onSendMessage={handleSendMessage}
          onStopStreaming={stopStreaming}
          isStreaming={isStreaming}
          isCentered={currentMessages.length === 0}
        />
      </div>
    </>
  );
};
