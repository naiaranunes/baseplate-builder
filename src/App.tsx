import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { supabase } from "@/integrations/supabase/client";

import AuthPage from "./pages/AuthPage";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import PendingApprovalPage from "./pages/PendingApprovalPage";
import DashboardPage from "./pages/DashboardPage";
import EntregasPage from "./pages/EntregasPage";
import EquipePage from "@/pages/EquipePage";
import RelatoriosPage from "./pages/RelatoriosPage";
import AjudaPage from "./pages/AjudaPage";
import SettingsPage from "./pages/SettingsPage";
import OnboardingPage from "./pages/OnboardingPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});

function TriggerHealthCheck() {
  useEffect(() => {
    const checked = sessionStorage.getItem("auth_trigger_checked");

    if (checked) return;

    supabase.functions
      .invoke("ensure-auth-trigger")
      .then(({ data, error }) => {
        sessionStorage.setItem("auth_trigger_checked", "1");

        if (error || !(data as { ok?: boolean })?.ok) {
          console.warn(
            "[Auth Setup] Trigger check failed:",
            error || (data as { message?: string })?.message,
          );
        }
      })
      .catch((err) => console.warn("[Auth Setup]", err));
  }, []);

  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />

      <BrowserRouter>
        <AuthProvider>
          <TriggerHealthCheck />

          <Routes>
            {/* Página inicial */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Autenticação */}
            <Route path="/auth" element={<AuthPage />} />

            {/* Recuperação de senha */}
            <Route path="/forgot-password" element={<ForgotPassword />} />

            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Aprovação de usuário */}
            <Route path="/pending-approval" element={
                <ProtectedRoute allowUnapproved>
                  <PendingApprovalPage />
                </ProtectedRoute>
              }
            />

            {/* Onboarding */}
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <OnboardingPage />
                </ProtectedRoute>
              }
            />

            {/* Dashboard */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />

            {/* Equipe */}
            <Route
              path="/equipe"
              element={
                <ProtectedRoute>
                  <EquipePage />
                </ProtectedRoute>
              }
            />

            {/* Entregas */}
            <Route
              path="/entregas"
              element={
                <ProtectedRoute>
                  <EntregasPage />
                </ProtectedRoute>
              }
            />

            {/* Relatórios */}
            <Route
              path="/relatorios"
              element={
                <ProtectedRoute>
                  <RelatoriosPage />
                </ProtectedRoute>
              }
            />

            {/* Ajuda */}
            <Route
              path="/ajuda"
              element={
                <ProtectedRoute>
                  <AjudaPage />
                </ProtectedRoute>
              }
            />

            {/* Configurações */}
            <Route
              path="/configuracoes/*"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />

            {/* Alias antigo para configurações */}
            <Route
              path="/settings/*"
              element={<Navigate to="/configuracoes" replace />}
            />

            {/* Página não encontrada */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
