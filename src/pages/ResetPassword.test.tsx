import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ResetPassword from "./ResetPassword";

const { getSession, onAuthStateChange, verifyOtp } = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  verifyOtp: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession, onAuthStateChange, verifyOtp },
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    isPasswordRecovery: true,
    clearPasswordRecovery: vi.fn(),
  }),
}));

function renderPage() {
  return render(
    <BrowserRouter>
      <ResetPassword />
    </BrowserRouter>,
  );
}

describe("ResetPassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    verifyOtp.mockResolvedValue({ error: null });
  });

  it("shows both password fields when a recovery session is available", async () => {
    getSession.mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
      error: null,
    });

    renderPage();

    expect(await screen.findByPlaceholderText("Digite sua nova senha")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Digite a senha novamente")).toBeInTheDocument();
  });

  it("offers to request a new recovery link when no session is available", async () => {
    getSession.mockResolvedValue({ data: { session: null }, error: null });

    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(/inválido ou expirou/i);
    expect(screen.getByRole("link", { name: "Solicitar novo link" })).toHaveAttribute(
      "href",
      "/forgot-password",
    );
  });
});
