import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EntregasPage from "./EntregasPage";

const mocks = vi.hoisted(() => ({
  role: "supervisor" as "admin" | "supervisor" | "agent",
  entregas: [
    {
      id: "leader-task",
      titulo: "Entrega do líder",
      descricao: null,
      area: null,
      lider_id: "supervisor-1",
      liderado_cadastro_id: "leader-profile",
      prazo: "2099-01-01",
      prazo_hora: null,
      status: "pendente" as const,
      periodicidade: "unica" as const,
      data_realizacao: null,
      observacao_realizacao: null,
      created_at: "2026-01-01",
    },
    {
      id: "member-task",
      titulo: "Entrega do colaborador",
      descricao: null,
      area: null,
      lider_id: "supervisor-1",
      liderado_cadastro_id: "member-profile",
      prazo: "2099-01-02",
      prazo_hora: null,
      status: "pendente" as const,
      periodicidade: "unica" as const,
      data_realizacao: null,
      observacao_realizacao: null,
      created_at: "2026-01-01",
    },
    {
      id: "leader-completed",
      titulo: "Histórico do líder",
      descricao: null,
      area: null,
      lider_id: "supervisor-1",
      liderado_cadastro_id: "leader-profile",
      prazo: "2026-01-01",
      prazo_hora: null,
      status: "entregue" as const,
      periodicidade: "unica" as const,
      data_realizacao: "2026-01-01",
      observacao_realizacao: null,
      created_at: "2026-01-01",
    },
    {
      id: "member-completed",
      titulo: "Histórico do colaborador",
      descricao: null,
      area: null,
      lider_id: "supervisor-1",
      liderado_cadastro_id: "member-profile",
      prazo: "2026-01-01",
      prazo_hora: null,
      status: "entregue" as const,
      periodicidade: "unica" as const,
      data_realizacao: "2026-01-01",
      observacao_realizacao: null,
      created_at: "2026-01-01",
    },
  ],
  liderados: [
    { id: "leader-profile", gestor_id: "admin-1", usuario_id: "supervisor-1", nome: "Líder", email: "leader@example.com", cargo: null, area: null, ativo: true, perfil_acesso: "supervisor" as const },
    { id: "member-profile", gestor_id: "supervisor-1", usuario_id: "agent-1", nome: "Colaborador", email: "member@example.com", cargo: null, area: null, ativo: true, perfil_acesso: "agent" as const },
  ],
}));

vi.mock("@/components/AppShell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: mocks.role === "agent" ? "agent-1" : "supervisor-1", email: "user@example.com" },
    isAdmin: mocks.role === "admin",
    isSupervisor: mocks.role === "supervisor",
  }),
}));

vi.mock("@/hooks/useEntregas", () => ({
  useEntregas: () => ({ data: mocks.entregas, isLoading: false }),
  useLiderados: () => ({ data: mocks.liderados, isLoading: false }),
  useMembros: () => ({ data: [] }),
  useHistorico: () => ({ data: [] }),
  useConvidarColaborador: () => ({ mutateAsync: vi.fn().mockResolvedValue("sent") }),
  useAddComentario: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateEntrega: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useExcluirEntrega: () => ({ mutateAsync: vi.fn() }),
  useExcluirLiderado: () => ({ mutateAsync: vi.fn() }),
  useRegistrarRealizacao: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSalvarLiderado: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateStatus: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));

describe("EntregasPage access by profile", () => {
  beforeEach(() => {
    mocks.role = "supervisor";
  });

  it("shows a leader's team agenda and history and meeting view", async () => {
    render(
      <MemoryRouter>
        <EntregasPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Agenda de Entregas" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Visão para reunião" })).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    let panel = screen.getByRole("tabpanel");
    expect(within(panel).getByText("Entrega do líder")).toBeInTheDocument();
    expect(within(panel).getByText("Entrega do colaborador")).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole("tab", { name: "Histórico" }), { button: 0, ctrlKey: false });
    await waitFor(() => expect(screen.getByRole("tab", { name: "Histórico" })).toHaveAttribute("data-state", "active"));
    panel = screen.getByRole("tabpanel");
    expect(within(panel).getByText("Histórico do líder")).toBeInTheDocument();
    expect(within(panel).getByText("Histórico do colaborador")).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole("tab", { name: "Visão para reunião" }), { button: 0, ctrlKey: false });
    await waitFor(() => expect(screen.getByRole("tab", { name: "Visão para reunião" })).toHaveAttribute("data-state", "active"));
    panel = screen.getByRole("tabpanel");
    expect(within(panel).getByText("Colaborador")).toBeInTheDocument();
    expect(within(panel).queryByText("Líder", { exact: true })).not.toBeInTheDocument();
  });

  it("filters a leader's agenda by collaborator", async () => {
    render(
      <MemoryRouter>
        <EntregasPage />
      </MemoryRouter>,
    );

    const scrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = vi.fn();
    try {
      fireEvent.keyDown(screen.getByRole("combobox"), { key: "ArrowDown" });
      fireEvent.click(await screen.findByRole("option", { name: "Colaborador" }));

      const panel = screen.getByRole("tabpanel");
      expect(within(panel).getByText("Entrega do colaborador")).toBeInTheDocument();
      expect(within(panel).queryByText("Entrega do líder")).not.toBeInTheDocument();
    } finally {
      Element.prototype.scrollIntoView = scrollIntoView;
    }
  });

  it("does not show meeting view to a collaborator", () => {
    mocks.role = "agent";
    render(
      <MemoryRouter>
        <EntregasPage />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("tab", { name: "Visão para reunião" })).not.toBeInTheDocument();
    const panel = screen.getByRole("tabpanel");
    expect(within(panel).getByText("Entrega do colaborador")).toBeInTheDocument();
    expect(within(panel).queryByText("Entrega do líder")).not.toBeInTheDocument();
  });
});
