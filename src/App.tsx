import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Layout } from "./components/Layout";
import { MainChat } from "./components/MainChat";
import { useChatStore } from "./store/chatStore";

import { DocsPage } from "./pages/DocsPage";


const LandingPage = React.lazy(() => {
  return Promise.all([
    import("./pages/LandingPage"),
    new Promise(resolve => setTimeout(resolve, 1500))
  ]).then(([module]) => ({ default: module.LandingPage }));
});
import { AnimatePresence } from "motion/react";
import { useSettingsStore } from "./store/settings";

import { TooltipProvider } from "./components/ui/tooltip";
import { ToastProvider } from "./components/ui/toast";
import { SharePage } from "./pages/SharePage";


function ChatApp() {
  const { loadChats } = useChatStore();

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
          <React.Suspense fallback={null}>
            <LandingPage />
          </React.Suspense>
        } />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="/chat" element={<ChatApp />} />
        <Route path="/share/:id" element={<SharePage />} />

      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  const theme = useSettingsStore((state) => state.appearance.theme);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  return (
    <BrowserRouter>
      <ToastProvider>
        <TooltipProvider>
          <AnimatedRoutes />
        </TooltipProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
