import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Layout } from "./components/Layout";
import { MainChat } from "./components/MainChat";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ChatProvider } from "./context/ChatContext";
import { LandingPage } from "./pages/LandingPage";


import { AuthCallback } from "./pages/AuthCallback";
import { DocsPage } from "./pages/DocsPage";
import { AnimatePresence } from "motion/react";
import { supabase } from "./lib/supabase";
import { syncProfileFromSupabaseUser, upsertProfileFromSupabaseUser } from "./lib/profileSync";
import { useSettingsStore } from "./store/settings";
import { AccentThemeProvider } from "./theme/AccentThemeProvider";

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

        <Route path="/auth/callback" element={<AuthCallback />} />

      </Routes>
    </AnimatePresence>
  );
}

function AuthProfileSync() {
  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (isMounted) {
        syncProfileFromSupabaseUser(data.session?.user);
        upsertProfileFromSupabaseUser(data.session?.user).catch(console.error);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      syncProfileFromSupabaseUser(session?.user);
      upsertProfileFromSupabaseUser(session?.user).catch(console.error);
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AccentThemeProvider>
        <ChatProvider>
          <AuthProfileSync />
          <AnimatedRoutes />
        </ChatProvider>
      </AccentThemeProvider>
    </BrowserRouter>
  );
}
