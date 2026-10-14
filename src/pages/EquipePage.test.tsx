import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EquipePage from "./EquipePage";

const mocks = vi.hoisted(() => ({
  isAdmin: false,
  salvarLiderado: vi.fn(),
  convidarColaborador: vi.fn(),
  liderados: [] as Array<{ id: string; nome: string; email: string; cargo: string; area: string; gestor_id: string; ativo: boolean; perfil_acesso: "agent" | "supervisor" }>,
}));

vi.mock("@/components/AppShell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/settings/TeamSettings", () => ({
  default: () => null,
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "leader-1" },
    isAdmin: mocks.isAdmin,
  }),
}));

vi.mock("@/hooks/useEntregas", () => ({
  useLiderados: () => ({ data: mocks.liderados, isLoading: false }),
  useLideres: () => ({ data: [{ id: "leader-1", full_name: "Líder" }] }),
  useSalvarLiderado: () => ({ mutateAsync: mocks.salvarLiderado, isPending: false }),
  useConvidarColaborador: () => ({ mutateAsync: mocks.convidarColaborador, isPending: false }),
  useExcluirLiderado: () => ({ mutateAsync: vi.fn() }),
}));

describe("EquipePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isAdmin = false;
    mocks.liderados = [];
  });

  it("renders with the collaborator dialog closed and opens the new collaborator form", () => {
    render(
      <MemoryRouter>
        <EquipePage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Equipe" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Novo colaborador" }));
    expect(screen.getByRole("heading", { name: "Novo colaborador" })).toBeInTheDocument();
    expect(screen.getByText("Tipo de usuário")).toBeInTheDocument();
    expect(screen.getByText("Líderes podem cadastrar apenas colaboradores.")).toBeInTheDocument();
    const comboboxes = screen.getAllByRole("combobox");
    expect(comboboxes[comboboxes.length - 2]).toBeDisabled();
  });

  it("allows an administrator to choose the leader profile for a new team member", async () => {
    mocks.isAdmin = true;
    mocks.salvarLiderado.mockResolvedValue("new-leader-id");
    mocks.convidarColaborador.mockResolvedValue("sent");
    render(
      <MemoryRouter>
        <EquipePage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Novo colaborador" }));
    expect(screen.getByText("Tipo de usuário")).toBeInTheDocument();
    const textboxes = screen.getAllByRole("textbox");
    fireEvent.change(textboxes[0], { target: { value: "Nova liderança" } });
    fireEvent.change(textboxes[1], { target: { value: "lider@empresa.com" } });
    const comboboxes = screen.getAllByRole("combobox");
    fireEvent.click(comboboxes[comboboxes.length - 2]);
    fireEvent.click(screen.getByRole("option", { name: "Líder" }));
    expect(screen.getByText("Líder")).toBeInTheDocument();
    expect(screen.queryByText("Líderes podem cadastrar apenas colaboradores.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cadastrar e enviar convite" }));

    await waitFor(() => expect(mocks.salvarLiderado).toHaveBeenCalledWith(expect.objectContaining({
      nome: "Nova liderança",
      email: "lider@empresa.com",
      perfil_acesso: "supervisor",
    })));
    expect(mocks.convidarColaborador).toHaveBeenCalledWith("new-leader-id");
  });

  it("offers to resend an invite when editing an existing team member", async () => {
    mocks.liderados = [{
      id: "member-1",
      nome: "Helena",
      email: "helena@example.com",
      cargo: "Vendedora",
      area: "Comercial e Vendas",
      gestor_id: "leader-1",
      ativo: true,
      perfil_acesso: "agent",
    }];
    mocks.convidarColaborador.mockResolvedValue("sent");
    render(
      <MemoryRouter>
        <EquipePage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTitle("Editar"));
    fireEvent.click(screen.getByRole("button", { name: "Reenviar convite" }));

    await waitFor(() => expect(mocks.convidarColaborador).toHaveBeenCalledWith("member-1"));
  });
});
