import { fireEvent, render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DashboardPage from "./DashboardPage";

const mocks = vi.hoisted(() => ({
  auth: { userId: "admin-user", isAdmin: true },
  isSupervisor: false,
  openLaunch: vi.fn(),
  entregas: [] as Array<Record<string, unknown>>,
  liderados: [] as Array<Record<string, unknown>>,
}));

vi.mock("@/components/AppShell", () => ({
  AppShell: ({ children }: {
    children: React.ReactNode | ((actions: { openLancarEntrega: () => void }) => React.ReactNode);
  }) => <div>{typeof children === "function"
    ? children({ openLancarEntrega: mocks.openLaunch })
    : children}</div>,
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    profile: { full_name: "Ana" },
    user: { id: mocks.auth.userId },
    isAdmin: mocks.auth.isAdmin,
    isSupervisor: mocks.isSupervisor,
  }),
}));

vi.mock("@/hooks/useOnboarding", () => ({
  useOnboarding: () => {
    throw new Error("Dashboard must not depend on onboarding state");
  },
}));

vi.mock("@/hooks/useEntregas", () => ({
  useEntregas: () => ({
    data: mocks.entregas,
    isLoading: false,
    isError: false,
  }),
  useLiderados: () => ({
    data: mocks.liderados,
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("@/components/metas/NovaMetaModal", () => ({
  NovaMetaModal: () => null,
}));

describe("DashboardPage", () => {
  beforeEach(() => {
    mocks.auth = { userId: "admin-user", isAdmin: true };
    mocks.isSupervisor = false;
    mocks.openLaunch.mockReset();
    const prazoProximo = new Date();
    prazoProximo.setDate(prazoProximo.getDate() + 1);
    const prazoFuturo = new Date();
    prazoFuturo.setDate(prazoFuturo.getDate() + 7);
    const toLocalISODate = (date: Date) => [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
    mocks.entregas = [{
      id: "overdue-1",
      titulo: "Enviar relatório",
      descricao: null,
      area: "Financeiro",
      lider_id: "leader-1",
      liderado_cadastro_id: "member-1",
      prazo: "2000-01-01",
      status: "pendente",
      periodicidade: "unica",
      data_realizacao: null,
      observacao_realizacao: null,
      created_at: "1999-12-01",
    }, {
      id: "completed-area-1",
      titulo: "Fechar balanço",
      descricao: null,
      area: "Financeiro",
      lider_id: "leader-1",
      liderado_cadastro_id: "member-1",
      prazo: "2000-01-01",
      status: "entregue",
      periodicidade: "unica",
      data_realizacao: "2000-01-01",
      observacao_realizacao: null,
      created_at: "1999-12-01",
    }, {
      id: "at-risk-1",
      titulo: "Preparar apresentação",
      descricao: null,
      area: "Financeiro",
      lider_id: "leader-1",
      liderado_cadastro_id: "member-1",
      prazo: toLocalISODate(prazoProximo),
      prazo_hora: null,
      status: "em_andamento",
      periodicidade: "unica",
      data_realizacao: null,
      observacao_realizacao: null,
      created_at: "1999-12-01",
    }, {
      id: "on-time-1",
      titulo: "Atualizar planejamento",
      descricao: null,
      area: "Financeiro",
      lider_id: "leader-1",
      liderado_cadastro_id: "member-1",
      prazo: toLocalISODate(prazoFuturo),
      prazo_hora: null,
      status: "pendente",
      periodicidade: "unica",
      data_realizacao: null,
      observacao_realizacao: null,
      created_at: "1999-12-01",
    }, {
      id: "overdue-other",
      titulo: "Atualizar orçamento",
      descricao: null,
      area: "Comercial",
      lider_id: "leader-2",
      liderado_cadastro_id: "member-2",
      prazo: "2000-01-01",
      status: "pendente",
      periodicidade: "unica",
      data_realizacao: null,
      observacao_realizacao: null,
      created_at: "1999-12-01",
    }];
    mocks.liderados = [
      { id: "member-1", usuario_id: "agent-user", nome: "Ana Colaboradora" },
      { id: "member-2", usuario_id: "other-user", nome: "Outro Colaborador" },
    ];
  });

  it("permite acessar o dashboard sem consultar ou bloquear por onboarding", () => {
    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>,
    );

    expect(screen.getByRole("heading", { name: /^(Bom dia|Boa tarde|Boa noite), Ana/ })).toBeInTheDocument();
    expect(screen.queryByText("Em atenção", { exact: true })).not.toBeInTheDocument();
    expect(screen.getByText("Total de Entregas").parentElement).toHaveTextContent("5");
    expect(screen.getByText("No prazo").parentElement).toHaveTextContent("2");
    expect(screen.getByText("Em risco").parentElement).toHaveTextContent("1");
    expect(screen.getAllByText("Entregas atrasadas")[0].parentElement).toHaveTextContent("2");
    expect(screen.getByRole("heading", { name: "Entregas atrasadas" })).toBeInTheDocument();
    expect(screen.getByText("Enviar relatório")).toHaveAttribute(
      "href",
      "/entregas?entrega=overdue-1",
    );
    expect(screen.getByText("Atualizar orçamento")).toBeInTheDocument();
    expect(screen.getAllByText("Ana Colaboradora")).toHaveLength(2);
    expect(screen.getAllByText("Atrasada")).toHaveLength(2);
    expect(screen.getByText("Preparar apresentação")).toBeInTheDocument();
    expect(screen.getByText("Próxima do vencimento")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Painel de Entregas por Área" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Financeiro" })).toBeInTheDocument();
    expect(screen.getByText("4 entregas atribuídas")).toBeInTheDocument();
    expect(screen.getByText("25%")).toBeInTheDocument();
  });

  it("limits delivery totals and panels to the logged-in person's assignments", () => {
    mocks.auth = { userId: "agent-user", isAdmin: false };

    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>,
    );

    expect(screen.getByText("Total de Entregas").parentElement).toHaveTextContent("4");
    expect(screen.getByText("No prazo").parentElement).toHaveTextContent("2");
    expect(screen.getByText("Em risco").parentElement).toHaveTextContent("1");
    expect(screen.getAllByText("Entregas atrasadas")[0].parentElement).toHaveTextContent("1");
    expect(screen.getByText("Preparar apresentação")).toBeInTheDocument();
    expect(screen.queryByText("Atualizar orçamento")).not.toBeInTheDocument();
    expect(screen.getByText("Enviar relatório")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Comercial" })).not.toBeInTheDocument();
  });

  it("includes a leader's direct reports in dashboard totals and panels", () => {
    mocks.auth = { userId: "leader-user", isAdmin: false };
    mocks.isSupervisor = true;
    mocks.liderados = [
      { id: "leader-profile", usuario_id: "leader-user", gestor_id: "admin-user", nome: "Líder" },
      { id: "member-1", usuario_id: "agent-user", gestor_id: "leader-user", nome: "Ana Colaboradora" },
      { id: "member-2", usuario_id: "other-user", gestor_id: "other-leader", nome: "Outro Colaborador" },
    ];

    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>,
    );

    expect(screen.getByText("Total de Entregas").parentElement).toHaveTextContent("4");
    expect(screen.getByText("No prazo").parentElement).toHaveTextContent("2");
    expect(screen.getByText("Em risco").parentElement).toHaveTextContent("1");
    expect(screen.getAllByText("Entregas atrasadas")[0].parentElement).toHaveTextContent("1");
    expect(screen.getByText("Enviar relatório")).toBeInTheDocument();
    expect(screen.queryByText("Atualizar orçamento")).not.toBeInTheDocument();
    expect(screen.getAllByText("Ana Colaboradora").length).toBeGreaterThan(0);
    expect(screen.queryByRole("heading", { name: "Comercial" })).not.toBeInTheDocument();
  });

  it("filters summary cards to deliveries due on the selected date", () => {
    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>,
    );

    const prazo = String(mocks.entregas.find((entrega) => entrega.id === "at-risk-1")?.prazo);
    fireEvent.change(screen.getByLabelText("Filtrar cards pela data do prazo"), {
      target: { value: prazo },
    });

    expect(screen.getByText("Total de Entregas").parentElement).toHaveTextContent("1");
    expect(screen.getByText("No prazo").parentElement).toHaveTextContent("0");
    expect(screen.getByText("Em risco").parentElement).toHaveTextContent("1");
    expect(screen.getAllByText("Entregas atrasadas")[0].parentElement).toHaveTextContent("0");

    fireEvent.click(screen.getByRole("button", { name: "Limpar" }));
    expect(screen.getByText("Total de Entregas").parentElement).toHaveTextContent("5");
  });

  it("shows the launch action for collaborators and opens the delivery launch dialog", () => {
    mocks.auth = { userId: "agent-user", isAdmin: false };

    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Lançar entrega" }));
    expect(mocks.openLaunch).toHaveBeenCalledOnce();
  });

  it("shows only active deliveries due within 48 hours in the risk list", () => {
    mocks.entregas = mocks.entregas.filter((delivery) => delivery.id === "at-risk-1");
    mocks.liderados = [
      { id: "member-1", usuario_id: "agent-user", nome: "Ana Colaboradora" },
    ];
    mocks.auth = { userId: "agent-user", isAdmin: false };

    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>,
    );

    expect(screen.getByText("Preparar apresentação")).toBeInTheDocument();
    expect(screen.getByText("Ana Colaboradora")).toBeInTheDocument();
    expect(screen.getByText("Próxima do vencimento")).toBeInTheDocument();
  });
});