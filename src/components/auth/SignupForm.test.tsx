import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignupForm } from "./SignupForm";

const { signUp, toastInfo } = vi.hoisted(() => ({
  signUp: vi.fn(),
  toastInfo: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ signUp }),
}));

vi.mock("sonner", () => ({
  toast: { info: toastInfo, error: vi.fn(), success: vi.fn() },
}));

describe("SignupForm email confirmation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signUp.mockResolvedValue({ pending: true, emailConfirmationRequired: true });
  });

  it("asks the user to confirm their address before accessing the account", async () => {
    render(
      <MemoryRouter initialEntries={["/auth"]}>
        <Routes>
          <Route path="/auth" element={<SignupForm />} />
          <Route path="/pending-approval" element={<div>Aprovação pendente</div>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Nome Completo"), { target: { value: "Pessoa Teste" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "pessoa@example.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "senha-segura" } });
    fireEvent.change(screen.getByLabelText("Confirmar Senha"), { target: { value: "senha-segura" } });
    fireEvent.click(screen.getByRole("button", { name: "Cadastrar" }));

    await waitFor(() => expect(signUp).toHaveBeenCalledWith("Pessoa Teste", "pessoa@example.com", "senha-segura"));
    expect(toastInfo).toHaveBeenCalledWith(expect.stringContaining("Confirme seu e-mail"));
    expect(screen.queryByText("Aprovação pendente")).not.toBeInTheDocument();
  });
});
