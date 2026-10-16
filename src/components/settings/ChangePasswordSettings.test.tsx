import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ChangePasswordSettings from "./ChangePasswordSettings";

const { signInWithPassword, updateUser, toast } = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  updateUser: vi.fn(),
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { signInWithPassword, updateUser } },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { email: "user@example.com" } }),
}));

vi.mock("sonner", () => ({ toast }));

describe("ChangePasswordSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signInWithPassword.mockResolvedValue({ error: null });
    updateUser.mockResolvedValue({ error: null });
  });

  it("verifies the current password before updating and confirms the new password", async () => {
    render(<ChangePasswordSettings />);

    fireEvent.change(screen.getByLabelText("Senha atual"), {
      target: { value: "senha-atual" },
    });
    fireEvent.change(screen.getByLabelText("Nova senha"), {
      target: { value: "senha-nova" },
    });
    fireEvent.change(screen.getByLabelText("Confirmar nova senha"), {
      target: { value: "senha-nova" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Alterar senha" }));

    await waitFor(() => {
      expect(signInWithPassword).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "senha-atual",
      });
      expect(updateUser).toHaveBeenCalledWith({ password: "senha-nova" });
      expect(toast.success).toHaveBeenCalledWith("Senha alterada com sucesso.");
    });
  });

  it("does not update the password if the confirmation does not match", async () => {
    render(<ChangePasswordSettings />);

    fireEvent.change(screen.getByLabelText("Senha atual"), {
      target: { value: "senha-atual" },
    });
    fireEvent.change(screen.getByLabelText("Nova senha"), {
      target: { value: "senha-nova" },
    });
    fireEvent.change(screen.getByLabelText("Confirmar nova senha"), {
      target: { value: "outra-senha" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Alterar senha" }));

    expect(toast.error).toHaveBeenCalledWith(
      "A confirmação da nova senha não coincide.",
    );
    expect(signInWithPassword).not.toHaveBeenCalled();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("does not update the password when the current password is incorrect", async () => {
    signInWithPassword.mockResolvedValue({
      error: { message: "Invalid login credentials" },
    });
    render(<ChangePasswordSettings />);

    fireEvent.change(screen.getByLabelText("Senha atual"), {
      target: { value: "senha-incorreta" },
    });
    fireEvent.change(screen.getByLabelText("Nova senha"), {
      target: { value: "senha-nova" },
    });
    fireEvent.change(screen.getByLabelText("Confirmar nova senha"), {
      target: { value: "senha-nova" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Alterar senha" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("A senha atual está incorreta.");
    });
    expect(updateUser).not.toHaveBeenCalled();
  });
});
