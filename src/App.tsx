import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Layout } from "./components/Layout";
import { MainChat } from "./components/MainChat";
import { useChatStore } from "./store/chatStore";

import { DocsPage } from "./pages/DocsPage";
import { LandingPageSkeleton } from "./components/landing/landing-page-skeleton";

const LandingPage = React.lazy(() => {
  return Promise.all([
    import("./pages/LandingPage"),
    new Promise(resolve => setTimeout(resolve, 1500))
  ]).then(([module]) => ({ default: module.LandingPage }));
});
import { AnimatePresence } from "motion/react";
import { useSettingsStore } from "./store/settings";
import { ThemeProvider } from "./theme/ThemeProvider";
import { TooltipProvider } from "./components/ui/tooltip";

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
        <Route path="/" element={
          <React.Suspense fallback={<LandingPageSkeleton />}>
            <LandingPage />
          </React.Suspense>
        } />
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
        <TooltipProvider>
          <AnimatedRoutes />
        </TooltipProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
