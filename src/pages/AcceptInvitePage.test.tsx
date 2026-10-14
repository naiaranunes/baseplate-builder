import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AcceptInvitePage from "./AcceptInvitePage";

const { updateUser, refreshProfile } = vi.hoisted(() => ({
  updateUser: vi.fn(),
  refreshProfile: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { updateUser } },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "collaborator-1" },
    isLoading: false,
    refreshProfile,
  }),
}));

describe("AcceptInvitePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateUser.mockResolvedValue({ error: null });
    refreshProfile.mockResolvedValue(undefined);
  });

  it("sets the password after confirming it and refreshes the collaborator profile", async () => {
    render(
      <MemoryRouter>
        <AcceptInvitePage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Nova senha"), {
      target: { value: "senha-segura" },
    });
    fireEvent.change(screen.getByLabelText("Confirmar nova senha"), {
      target: { value: "senha-segura" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Concluir cadastro" }));

    await waitFor(() => {
      expect(updateUser).toHaveBeenCalledWith({ password: "senha-segura" });
    });
    expect(refreshProfile).toHaveBeenCalledOnce();
  });

  it("does not update the password when the confirmation differs", async () => {
    render(
      <MemoryRouter>
        <AcceptInvitePage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Nova senha"), {
      target: { value: "senha-segura" },
    });
    fireEvent.change(screen.getByLabelText("Confirmar nova senha"), {
      target: { value: "senha-diferente" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Concluir cadastro" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("As senhas não coincidem.");
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("explains that an expired invite link must be resent", () => {
    render(
      <MemoryRouter initialEntries={["/accept-invite?error=access_denied&error_code=otp_expired"]}>
        <AcceptInvitePage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(/link do convite expirou ou já foi usado/i);
    expect(screen.getByRole("link", { name: "Ir para o login" })).toHaveAttribute("href", "/auth");
  });
});
