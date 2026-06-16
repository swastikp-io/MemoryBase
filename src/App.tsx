import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Layout } from "./components/Layout";
import { MainChat } from "./components/MainChat";
import { useChatStore } from "./store/chatStore";
import { LandingPage } from "./pages/LandingPage";


import { DocsPage } from "./pages/DocsPage";
import { AnimatePresence } from "motion/react";
import { useSettingsStore } from "./store/settings";
import { ThemeProvider } from "./theme/ThemeProvider";

function ChatApp() {
  const { loadChats, chats, activeChatId, loadChat, createChat } = useChatStore();

  useEffect(() => {
    const init = async () => {
      await loadChats();
      // Set empty state for new session without clearing sidebar chats
      useChatStore.setState({ activeChatId: null, messages: [] });
    };
    init();
  }, []);

  return (
    <Layout>
      <MainChat />
    </Layout>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="/chat" element={<ChatApp />} />

      </Routes>
    </AnimatePresence>
  );
}

import { useThemeValidator } from "./hooks/useThemeValidator";

export default function App() {
  useThemeValidator();


  return (
    <BrowserRouter>
      <ThemeProvider>
        <AnimatedRoutes />
      </ThemeProvider>
    </BrowserRouter>
  );
}
