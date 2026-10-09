import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import DashboardPage from "./DashboardPage";

vi.mock("@/components/AppShell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    profile: { full_name: "Ana" },
    role: "admin",
  }),
}));

vi.mock("@/hooks/useOnboarding", () => ({
  useOnboarding: () => {
    throw new Error("Dashboard must not depend on onboarding state");
  },
}));

vi.mock("@/hooks/useMetas", () => ({
  useMetas: () => ({
    data: [],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useMembros: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/hooks/useEntregas", () => ({
  useEntregas: () => ({
    data: [{
      id: "overdue-1",
      titulo: "Enviar relatório",
      descricao: null,
      lider_id: "leader-1",
      liderado_cadastro_id: "member-1",
      prazo: "2000-01-01",
      status: "pendente",
      periodicidade: "unica",
      data_realizacao: null,
      observacao_realizacao: null,
      created_at: "1999-12-01",
    }],
    isLoading: false,
    isError: false,
  }),
  useLiderados: () => ({
    data: [{ id: "member-1", nome: "Ana Colaboradora" }],
    isError: false,
  }),
}));

vi.mock("@/components/metas/NovaMetaModal", () => ({
  NovaMetaModal: () => null,
}));

describe("DashboardPage", () => {
  it("permite acessar o dashboard sem consultar ou bloquear por onboarding", () => {
    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>,
    );

    expect(screen.getByRole("heading", { name: /^(Bom dia|Boa tarde|Boa noite), Ana/ })).toBeInTheDocument();
    expect(screen.queryByText("Em atenção", { exact: true })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Entregas atrasadas" })).toBeInTheDocument();
    expect(screen.getByText("Enviar relatório")).toHaveAttribute(
      "href",
      "/agenda-entregas?entrega=overdue-1",
    );
    expect(screen.getByText("Ana Colaboradora")).toBeInTheDocument();
    expect(screen.getByText("Atrasada")).toBeInTheDocument();
  });
});