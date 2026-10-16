import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import ColaboradorDashboardPage from "./ColaboradorDashboardPage";

vi.mock("@/components/AppShell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ profile: { full_name: "Ana Colaboradora" } }),
}));

vi.mock("@/hooks/useEntregas", () => ({
  useEntregas: () => ({
    data: [{
      id: "delivery-1",
      titulo: "Enviar relatório",
      descricao: null,
      lider_id: "leader-1",
      liderado_cadastro_id: "member-1",
      prazo: "2099-01-01",
      status: "pendente",
      periodicidade: "unica",
      data_realizacao: null,
      observacao_realizacao: null,
      created_at: "2098-12-01",
    }],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

describe("ColaboradorDashboardPage", () => {
  it("mostra as entregas atribuídas, acesso para registrá-las e personalização do perfil", () => {
    render(
      <BrowserRouter>
        <ColaboradorDashboardPage />
      </BrowserRouter>,
    );

    expect(screen.getByRole("heading", { name: "Olá, Ana!" })).toBeInTheDocument();
    expect(screen.getByText("Enviar relatório")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Entregar/ })).toHaveAttribute(
      "href",
      "/minhas-entregas?entrega=delivery-1",
    );
    expect(screen.getByRole("link", { name: "Personalizar meu perfil" })).toHaveAttribute("href", "/perfil");
  });
});
