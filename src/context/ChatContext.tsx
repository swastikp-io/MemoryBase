import React, { createContext, useContext, useState, useEffect } from 'react';
import { SUPER_PROMPT } from '../lib/prompt';
import { useSettingsStore } from '../store/settings';

export interface Message {
  id: string;
  role: "user" | "model" | "system";
  content: string;
  images?: string[];
  isSearchingWeb?: boolean;
  source?: "voice" | "text";
  autoSent?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
  createdAt?: number;
  modelId?: string;
  isTitleGenerated?: boolean;
  isCustomTitle?: boolean;
}

interface ChatContextType {
  chats: ChatSession[];
  currentChatId: string | null;
  currentMessages: Message[];
  createNewChat: () => void;
  selectChat: (id: string) => void;
  addMessage: (message: Message, forceChatId?: string, newChatTitle?: string, initialModelId?: string) => string;
  updateModelMessage: (chatId: string, messageId: string, content: string, append?: boolean, isSearchingWeb?: boolean) => void;
  updateChatTitle: (chatId: string, newTitle: string, isGenerated?: boolean, isCustom?: boolean) => void;
  updateChatModel: (chatId: string, modelId: string) => void;
  editAndTruncateAndAddMessage: (chatId: string, messageId: string, newContent: string, newModelMessage: Message) => void;
  clearAllChats: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  // Load chats on initial render
  useEffect(() => {
    const storedChats = localStorage.getItem('dewai_chats');
    if (storedChats) {
      try {
        const parsed = JSON.parse(storedChats);
        setChats(parsed);
      } catch (e) {
        console.error("Failed to parse chats from local storage", e);
      }
    }
  }, []);

  // Save chats whenever they change
  useEffect(() => {
    localStorage.setItem('dewai_chats', JSON.stringify(chats));
  }, [chats]);

  const createNewChat = () => {
    // Check if an empty chat already exists to avoid creating duplicates
    const emptyChat = chats.find(c => c.messages.length <= 1 && c.title === 'New Chat');
    if (emptyChat) {
      setCurrentChatId(emptyChat.id);
      return;
    }

    const newChatId = Date.now().toString();
    const settings = useSettingsStore.getState();
      
    let dynamicSystemContent = SUPER_PROMPT;
    
    let personalizationAdditions = `\n\n# User Personalization Settings`;
    personalizationAdditions += `\n- Name: ${settings.profile.displayName || 'User'}`;
    
    if (settings.personalization.instructionsAbout) {
      personalizationAdditions += `\n- About the User: ${settings.personalization.instructionsAbout}`;
    }
    if (settings.personalization.instructionsRespond) {
      personalizationAdditions += `\n- How to Respond: ${settings.personalization.instructionsRespond}`;
    }
    
    if (settings.personalization.preferredFormat && settings.personalization.preferredFormat.length > 0) {
      personalizationAdditions += `\n- Preferred Format: ${settings.personalization.preferredFormat.join(', ')}`;
    }
    
    if (settings.personalization.tone && settings.personalization.tone.length > 0) {
      personalizationAdditions += `\n- Conversation Tone: ${settings.personalization.tone.join(', ')}`;
    }
    
    dynamicSystemContent += personalizationAdditions;
    
    const systemPrompt: Message = {
      id: `system-${newChatId}`,
      role: "system",
      content: dynamicSystemContent
    };

    const newChat: ChatSession = {
      id: newChatId,
      title: 'New Chat',
      messages: [systemPrompt],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isTitleGenerated: false,
      isCustomTitle: false,
    };
    
    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChatId);
  };

  const selectChat = (id: string) => {
    setCurrentChatId(id);
  };

  const clearAllChats = () => {
    setChats([]);
    setCurrentChatId(null);
  };

  const addMessage = (message: Message, forceChatId?: string, newChatTitle?: string, initialModelId?: string): string => {
    let activeChatId = currentChatId;
    if (forceChatId) {
      activeChatId = forceChatId;
    }
    
    if (!activeChatId) {
      // Create a new chat session
      const newChatId = Date.now().toString();
      
      const settings = useSettingsStore.getState();
      
      let dynamicSystemContent = SUPER_PROMPT;
      
      let personalizationAdditions = `\n\n# User Personalization Settings`;
      personalizationAdditions += `\n- Name: ${settings.profile.displayName || 'User'}`;
      
      if (settings.personalization.instructionsAbout) {
        personalizationAdditions += `\n- About the User: ${settings.personalization.instructionsAbout}`;
      }
      if (settings.personalization.instructionsRespond) {
        personalizationAdditions += `\n- How to Respond: ${settings.personalization.instructionsRespond}`;
      }
      
      if (settings.personalization.preferredFormat && settings.personalization.preferredFormat.length > 0) {
        personalizationAdditions += `\n- Preferred Format: ${settings.personalization.preferredFormat.join(', ')}`;
      }
      
      if (settings.personalization.tone && settings.personalization.tone.length > 0) {
        personalizationAdditions += `\n- Conversation Tone: ${settings.personalization.tone.join(', ')}`;
      }
      
      dynamicSystemContent += personalizationAdditions;
      
      const systemPrompt: Message = {
        id: `system-${newChatId}`,
        role: "system",
        content: dynamicSystemContent
      };

      const newChat: ChatSession = {
        id: newChatId,
        title: newChatTitle || 'New Chat',
        messages: [systemPrompt, message],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        modelId: initialModelId,
        isTitleGenerated: false,
        isCustomTitle: false,
      };
      setChats(prev => [newChat, ...prev]);
      setCurrentChatId(newChatId);
      return newChatId;
    } else {
      // Append to current chat
      setChats(prev => prev.map(chat => {
        if (chat.id === activeChatId) {
          return {
            ...chat,
            messages: [...chat.messages, message],
            updatedAt: Date.now(),
          };
        }
        return chat;
      }));
      return activeChatId;
    }
  };

  const updateModelMessage = (chatId: string, messageId: string, content: string, append: boolean = false, isSearchingWeb?: boolean) => {
    setChats(prev => prev.map(chat => {
      if (chat.id === chatId) {
        return {
          ...chat,
          messages: chat.messages.map(msg => 
            msg.id === messageId 
              ? { 
                  ...msg, 
                  content: append ? msg.content + content : content,
                  ...(isSearchingWeb !== undefined ? { isSearchingWeb } : {})
                } 
              : msg
          ),
          updatedAt: Date.now(),
        };
      }
      return chat;
    }));
  };

  const updateChatTitle = (chatId: string, newTitle: string, isGenerated: boolean = false, isCustom: boolean = false) => {
    setChats(prev => prev.map(chat => {
      if (chat.id === chatId) {
        return {
          ...chat,
          title: newTitle,
          isTitleGenerated: isGenerated ? true : chat.isTitleGenerated,
          isCustomTitle: isCustom ? true : chat.isCustomTitle,
          updatedAt: Date.now(),
        };
      }
      return chat;
    }));
  };

  const updateChatModel = (chatId: string, modelId: string) => {
    setChats(prev => prev.map(chat => {
      if (chat.id === chatId) {
        return { ...chat, modelId, updatedAt: Date.now() };
      }
      return chat;
    }));
  };

  const editAndTruncateAndAddMessage = (chatId: string, messageId: string, newContent: string, newModelMessage: Message) => {
    setChats(prev => prev.map(chat => {
      if (chat.id === chatId) {
        const messageIndex = chat.messages.findIndex(m => m.id === messageId);
        if (messageIndex === -1) return chat;
        
        // Keep messages up to the edited one, but update the edited one's content
        const newMessages = chat.messages.slice(0, messageIndex + 1);
        newMessages[messageIndex] = { ...newMessages[messageIndex], content: newContent };
        
        // Add the new placeholder model message immediately
        newMessages.push(newModelMessage);
        
        return {
          ...chat,
          messages: newMessages,
          updatedAt: Date.now(),
        };
      }
      return chat;
    }));
  };

  const currentMessages = currentChatId 
    ? chats.find(c => c.id === currentChatId)?.messages || []
    : [];

  return (
    <ChatContext.Provider value={{
      chats,
      currentChatId,
      currentMessages,
      createNewChat,
      selectChat,
      addMessage,
      updateModelMessage,
      updateChatTitle,
      updateChatModel,
      editAndTruncateAndAddMessage,
      clearAllChats,
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
