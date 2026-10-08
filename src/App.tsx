import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { supabase } from "@/integrations/supabase/client";

import AuthPage from "./pages/AuthPage";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import PendingApprovalPage from "./pages/PendingApprovalPage";
import DashboardPage from "./pages/DashboardPage";
import ColaboradorDashboardPage from "./pages/ColaboradorDashboardPage";
import MetasPage from "./pages/MetasPage";
import AnaliseMetaPage from "./pages/AnaliseMetaPage";
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

function HomeRedirect() {
  const { role, isLoading } = useAuth();
  if (isLoading) return null;
  return <Navigate to="/dashboard" replace />;
}

function LegacyDeliveriesRedirect() {
  const { role, isLoading } = useAuth();
  if (isLoading) return null;
  return <Navigate to={role === "agent" ? "/minhas-entregas" : "/agenda-entregas"} replace />;
}

function LegacyMetasRedirect() {
  const { role, isLoading } = useAuth();
  const { search } = useLocation();
  if (isLoading) return null;
  return (
    <Navigate
      to={`${role === "agent" ? "/minhas-entregas" : "/gestao-entregas"}${role === "agent" ? "" : search}`}
      replace
    />
  );
}

function LegacyMetaAnalysisRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/entregas/${id}/analise`} replace />;
}

function RoleDashboardPage() {
  const { role } = useAuth();
  return role === "agent" ? <ColaboradorDashboardPage /> : <DashboardPage />;
}

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
            <Route path="/" element={<HomeRedirect />} />

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
                <ProtectedRoute allowedRoles={["admin", "supervisor"]}>
                  <OnboardingPage />
                </ProtectedRoute>
              }
            />

            {/* Dashboard */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <RoleDashboardPage />
                </ProtectedRoute>
              }
            />

            <Route path="/gestao-entregas" element={
                <ProtectedRoute allowedRoles={["admin", "supervisor"]}>
                  <MetasPage />
                </ProtectedRoute>
              }
            />
            <Route path="/entregas" element={<LegacyDeliveriesRedirect />} />
            <Route path="/metas" element={<LegacyMetasRedirect />} />
            <Route
              path="/metas/:id/analise"
              element={
                <ProtectedRoute allowedRoles={["admin", "supervisor"]}>
                  <LegacyMetaAnalysisRedirect />
                </ProtectedRoute>
              }
            />

            <Route
              path="/entregas/:id/analise"
              element={
                <ProtectedRoute allowedRoles={["admin", "supervisor"]}>
                  <AnaliseMetaPage />
                </ProtectedRoute>
              }
            />

            {/* Equipe */}
            <Route
              path="/equipe"
              element={
                <ProtectedRoute allowedRoles={["admin", "supervisor"]}>
                  <EquipePage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/agenda-entregas"
              element={
                <ProtectedRoute allowedRoles={["admin", "supervisor"]}>
                  <EntregasPage mode="agenda" />
                </ProtectedRoute>
              }
            />

            <Route
              path="/minhas-entregas"
              element={
                <ProtectedRoute allowedRoles={["agent"]}>
                  <EntregasPage mode="mine" />
                </ProtectedRoute>
              }
            />

            {/* Relatórios */}
            <Route
              path="/relatorios"
              element={
                <ProtectedRoute allowedRoles={["admin", "supervisor"]}>
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

            <Route
              path="/perfil"
              element={
                <ProtectedRoute>
                  <SettingsPage profileOnly />
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
