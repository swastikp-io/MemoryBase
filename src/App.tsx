import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Layout } from "./components/Layout";
import { MainChat } from "./components/MainChat";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ChatProvider } from "./context/ChatContext";
import { LandingPage } from "./pages/LandingPage";


import { DocsPage } from "./pages/DocsPage";
import { AnimatePresence } from "motion/react";
import { useSettingsStore } from "./store/settings";
import { ThemeProvider } from "./theme/ThemeProvider";

function ChatApp() {
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
        <Route path="/chat" element={<ProtectedRoute><ChatApp /></ProtectedRoute>} />

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
        <ChatProvider>
          <AnimatedRoutes />
        </ChatProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
